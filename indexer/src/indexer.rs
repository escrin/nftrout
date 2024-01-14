use std::collections::HashMap;

use ethers::types::{Address, U256};
use futures::StreamExt as _;
use parking_lot::RwLock;
use tokio::time::{sleep, timeout, Duration};
use tracing::{debug, error, instrument, trace, warn};

use crate::{
    db::Db,
    ipfs::Client as IpfsClient,
    nftrout::{
        algo::{self, Ancestors},
        Client as NFTroutClient, Event, PendingToken, TokenEvent, TokenEventKind, TokenId,
        TroutToken,
    },
    utils::retry,
};

const INDEX_BATCH_SIZE: usize = 50;
const PIN_BATCH_SIZE: usize = 50;
const IPFS_TIMEOUT: Duration = Duration::from_secs(15);
const PINNING_TIMEOUT: Duration = Duration::from_secs(10 * 60);

#[instrument(skip_all)]
pub async fn run(nftrout: &NFTroutClient, ipfs_client: &IpfsClient, db: &Db) {
    let chain = nftrout.chain_id();
    let (tokens, needs_coi_analysis, events_start_block) = db
        .with_conn(|conn| {
            Ok((
                conn.list_tokens_for_ui(None)?,
                conn.needs_coi_analysis()?,
                conn.latest_processed_block(chain)?,
            ))
        })
        .unwrap();
    let g = RwLock::new(algo::make_graph(tokens.into_iter()));

    // Quickly index new and changed token metadata
    let start_block = retry(|| nftrout.latest_block()).await;
    {
        let past_nftrout = nftrout.at_block(start_block);
        debug!("starting initial index from {start_block}");
        index_ownership_and_fees(&past_nftrout, db, None).await;
        index_new_tokens(&past_nftrout, ipfs_client, db, &g, None).await;
        index_new_versions(&past_nftrout, ipfs_client, db, &g, None).await;
        debug!("finished initial index from {start_block}");
    }

    if !needs_coi_analysis.is_empty() {
        let g = g.read();
        debug!("starting COI analysis");
        let cois = needs_coi_analysis
            .iter()
            .copied()
            .map(|token| (token, algo::inbreeding(&g, token)))
            .collect::<Vec<_>>();
        db.with_tx(|tx| tx.set_cois(cois.into_iter())).unwrap();
        debug!("completed COI analysis");
    }

    let pin_fut = async {
        loop {
            debug!("pinning unpinned CIDs");
            if timeout(PINNING_TIMEOUT, pin_cids(ipfs_client, db, None))
                .await
                .is_err()
            {
                warn!("pinning timed out");
            }
            sleep(Duration::from_secs(60)).await;
        }
    };

    let reindex_fut = async {
        loop {
            debug!("batch re-indexing tokens");
            let new_fut = index_new_tokens(nftrout, ipfs_client, db, &g, None);
            let skipped_fut = index_skipped_tokens(nftrout, ipfs_client, db, &g, None);
            let pending_fut = index_new_versions(nftrout, ipfs_client, db, &g, None);
            tokio::join!(new_fut, skipped_fut, pending_fut);
            debug!("finished batch re-indexing");
            sleep(Duration::from_secs(30)).await;
        }
    };

    let events_fut = nftrout
        .events(events_start_block, Some(start_block))
        .buffered(100)
        .chunks(1000)
        .for_each(|batch| async move {
            db.with_tx(|tx| tx.record_events(chain, batch.iter().flatten()))
                .unwrap()
        });

    // Start watching blocks for real-time updates
    debug!("watching events stream");
    let realtime_fut = nftrout
        .events(start_block + 1, None)
        .buffered(25)
        .chunks(1) // set higher for greater throughput, but higher latency
        .for_each(|batch| async move {
            integrate_token_events(nftrout, db, &batch).await;
            db.with_tx(|tx| tx.record_events(nftrout.chain_id(), batch.iter().flatten()))
                .unwrap();
        });

    tokio::join!(realtime_fut, events_fut, pin_fut, reindex_fut);
    unreachable!("contract event stream broke");
}

#[instrument(skip_all)]
async fn index_ownership_and_fees(nftrout: &NFTroutClient, db: &Db, concurrency: Option<usize>) {
    let chain_id = nftrout.chain_id();
    trace!("fetching total supply");
    let total_supply = retry(|| nftrout.total_supply()).await;
    trace!("fetching studs");
    let studs = retry(|| nftrout.studs()).await;
    let concurrency = concurrency
        .unwrap_or(INDEX_BATCH_SIZE)
        .min(u32::max_value() as usize);
    trace!(count = total_supply, "indexing ownership and fees");
    for i in (1..=total_supply).step_by(concurrency) {
        let batch = i..(i + concurrency as u32).min(total_supply + 1);
        trace!("fetching batch owners");
        let owners = retry(|| nftrout.owners(batch.clone())).await;
        trace!("fetching batch fess");
        let fees = batch.clone().map(|i| studs.get(&i));
        trace!("writing batch updates");
        db.with_tx(|tx| {
            tx.update_fees(chain_id, batch.clone().zip(fees))?;
            tx.update_owners(chain_id, batch.zip(owners.iter().as_ref()))?;
            Ok(())
        })
        .unwrap();
    }
}

#[instrument(skip_all)]
async fn integrate_token_events<const N: usize>(
    nftrout: &NFTroutClient,
    db: &Db,
    batch: &[smallvec::SmallVec<[Event; N]>],
) {
    let chain_id = nftrout.chain_id();
    let mut ownership_changes: HashMap<TokenId, &Address> = HashMap::new();
    let mut pending_tokens: HashMap<TokenId, PendingToken> = HashMap::new();
    let mut fee_changes: HashMap<TokenId, Option<&U256>> = HashMap::new();
    for event in batch.iter().flatten() {
        let TokenEvent {
            token: id, kind, ..
        } = match event {
            Event::Token(event) => event,
            Event::ProcessedBlock(_) => continue,
        };
        let id = *id;
        match kind {
            TokenEventKind::Relisted { fee } => {
                fee_changes.insert(id, fee.as_ref());
                debug!(id = id, "listed token")
            }
            TokenEventKind::Spawned { to } => {
                let pending = crate::nftrout::PendingToken { id, owner: to };
                pending_tokens.insert(id, pending);
                debug!(id = id, to = %to, "created token");
            }
            TokenEventKind::Transfer { from, to } => {
                ownership_changes
                    .entry(id)
                    .and_modify(|v| debug_assert_eq!(*v, from))
                    .insert_entry(to);
                debug!(id = id, to = %to, "transferred token")
            }
        }
    }
    if fee_changes.is_empty() && ownership_changes.is_empty() && pending_tokens.is_empty() {
        return;
    }
    db.with_tx(|tx| {
        if !fee_changes.is_empty() {
            tx.update_fees(chain_id, fee_changes.into_iter()).unwrap();
        }
        if !ownership_changes.is_empty() {
            tx.update_owners(chain_id, ownership_changes.into_iter())
                .unwrap();
        }
        if !pending_tokens.is_empty() {
            debug_assert!(pending_tokens.values().all(|t| !t.owner.is_zero()));
            tx.insert_pending_tokens(chain_id, pending_tokens.into_iter())
                .unwrap()
        }
        Ok(())
    })
    .unwrap();
}

#[instrument(skip_all)]
async fn pin_cids(ipfs_client: &IpfsClient, db: &Db, concurrency: Option<usize>) {
    let cids_to_pin = db.with_conn(|conn| conn.unpinned_cids()).unwrap();
    debug!(count = cids_to_pin.len(), "pinning cids");
    let concurrency = concurrency.unwrap_or(PIN_BATCH_SIZE);
    futures::stream::iter(cids_to_pin)
        .map(|cid| async move {
            match timeout(IPFS_TIMEOUT, ipfs_client.pin(&cid)).await {
                Err(_) => warn!("failed to pin {cid}: timed out"),
                Ok(Err(e)) => warn!("failed to pin {cid}: {e}"),
                Ok(Ok(_)) => return Ok(cid),
            }
            Err(cid)
        })
        .buffer_unordered(concurrency)
        .ready_chunks(concurrency)
        .for_each(|mut cids| async move {
            let pp = cids.iter_mut().partition_in_place(|c| c.is_ok());
            db.with_conn(|conn| {
                conn.mark_pinned(cids[..pp].iter().map(|c| c.as_ref().unwrap()))?;
                conn.mark_pin_failed(cids[pp..].iter().map(|c| c.as_ref().unwrap_err()))?;
                Ok(())
            })
            .unwrap()
        })
        .await;
    debug!("finished pinning");
}

#[instrument(skip_all)]
async fn index_new_tokens(
    nftrout: &NFTroutClient,
    ipfs_client: &IpfsClient,
    db: &Db,
    g: &RwLock<Ancestors>,
    concurrency: Option<usize>,
) {
    let latest_known_token_id = db
        .with_conn(|conn| conn.latest_known_token_id(nftrout.chain_id()))
        .unwrap()
        .unwrap_or_default();
    trace!("fetching total supply");
    let total_supply = retry(|| nftrout.total_supply()).await;
    index_tokens(
        (latest_known_token_id + 1)..=total_supply,
        nftrout,
        ipfs_client,
        db,
        g,
        concurrency,
    )
    .await
}

#[instrument(skip_all)]
async fn index_new_versions(
    nftrout: &NFTroutClient,
    ipfs_client: &IpfsClient,
    db: &Db,
    g: &RwLock<Ancestors>,
    concurrency: Option<usize>,
) {
    let chain_id = nftrout.chain_id();
    let ids_to_reindex = db
        .with_conn(|conn| conn.outdated_token_ids(chain_id))
        .unwrap();
    index_tokens(
        ids_to_reindex.into_iter(),
        nftrout,
        ipfs_client,
        db,
        g,
        concurrency,
    )
    .await
}

#[instrument(skip_all)]
async fn index_skipped_tokens(
    nftrout: &NFTroutClient,
    ipfs_client: &IpfsClient,
    db: &Db,
    g: &RwLock<Ancestors>,
    concurrency: Option<usize>,
) {
    let known_token_ids = db
        .with_conn(|conn| conn.token_ids(nftrout.chain_id()))
        .unwrap();
    let latest_known_token_id = match known_token_ids.last() {
        Some(id) => *id,
        None => return,
    };
    index_tokens(
        gaps(known_token_ids.into_iter(), latest_known_token_id),
        nftrout,
        ipfs_client,
        db,
        g,
        concurrency,
    )
    .await
}

/// Returns an iterator containing the items in the range 1..=max that are not present in `present`.
/// # Arguments
/// * `present` - an iterator that yields a sorted list of present numbers in 1..=max
/// * `max` - the (inclusive) maximum number that may currently be present
fn gaps(present: impl Iterator<Item = TokenId>, max: TokenId) -> impl Iterator<Item = TokenId> {
    let mut current = 1;
    let mut iter = present.peekable();
    std::iter::from_fn(move || {
        while current <= max {
            match iter.peek() {
                Some(&n) if n == current => {
                    iter.next();
                    current += 1;
                }
                _ => {
                    let gap = current;
                    current += 1;
                    return Some(gap);
                }
            }
        }
        None
    })
}

#[instrument(skip_all)]
async fn index_tokens(
    mut token_ids: impl Iterator<Item = TokenId>,
    nftrout: &NFTroutClient,
    ipfs_client: &IpfsClient,
    db: &Db,
    g: &RwLock<Ancestors>,
    concurrency: Option<usize>,
) {
    trace!("fetching studs");
    let studs = retry(|| nftrout.studs()).await;

    let concurrency = concurrency
        .unwrap_or(INDEX_BATCH_SIZE)
        .min(u32::max_value() as usize);
    loop {
        let batch = token_ids.by_ref().take(concurrency);
        let batch: Vec<_> = batch.collect();
        if batch.is_empty() {
            break;
        }

        trace!("fetching owners");
        let owners = retry(|| nftrout.owners(batch.iter().copied())).await;
        trace!("fetching fees");
        let fees = batch.iter().map(|i| studs.get(i).copied());
        let mut tokens = futures::stream::iter(batch.iter().zip(owners).zip(fees))
            .filter_map(|((token_id, owner), fee)| async move {
                trace!(id = token_id, "fetching token CID");
                let cid = retry(|| nftrout.token_cid(*token_id)).await?;
                trace!(cid = ?cid, "fetching CID data");
                let meta = match timeout(IPFS_TIMEOUT, ipfs_client.dag_get(&cid)).await {
                    Err(_) => {
                        warn!("failed to get {cid}: timed out");
                        return None;
                    }
                    Ok(Err(e)) => {
                        error!("failed to get {cid}: {e}");
                        return None;
                    }
                    Ok(Ok(meta)) => meta,
                };
                Some(futures::future::ready(TroutToken {
                    cid,
                    meta,
                    owner,
                    fee,
                    coi: -1.0,
                }))
            })
            .buffer_unordered(concurrency)
            .collect::<Vec<_>>()
            .await;

        {
            let mut g = g.write();
            for token in tokens.iter() {
                let self_id = token.meta.properties.self_id;
                let n = g.add_node(self_id);
                if let Some(l) = token.meta.properties.left {
                    if !g.contains_node(l) {
                        warn!(
                            token = ?self_id,
                            parent = ?l,
                            "skipping analysis due to missing left parent"
                        );
                        continue;
                    }
                    g.add_edge(n, l, ());
                }
                if let Some(r) = token.meta.properties.right {
                    if !g.contains_node(r) {
                        warn!(
                            token = ?self_id,
                            parent = ?r,
                            "skipping analysis due to missing right parent"
                        );
                        continue;
                    }
                    g.add_edge(n, r, ());
                }
            }
            for token in tokens.iter_mut() {
                token.coi = algo::inbreeding(&g, token.meta.properties.self_id);
            }
        }

        db.with_conn(|conn| conn.insert_tokens(tokens.iter()))
            .unwrap();
    }
}
