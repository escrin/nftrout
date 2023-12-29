use std::collections::HashMap;

use ethers::types::{Address, U256};
use futures::StreamExt;
use tokio::time::{timeout, Duration};
use tracing::{debug, instrument, warn};

use crate::{
    db::Db,
    ipfs::{Cid, Client as IpfsClient},
    nftrout::{Client as NFTroutClient, Event, TokenId, TroutId, TroutMetadata, TroutToken},
    utils::retry,
};

const INDEX_BATCH_SIZE: usize = 50;
const PIN_BATCH_SIZE: usize = 50;
const IPFS_TIMEOUT: Duration = Duration::from_secs(60);
const PINNING_TIMEOUT: Duration = Duration::from_secs(10 * 60);

#[instrument(skip_all)]
pub async fn run(nftrout: &NFTroutClient, ipfs_client: &IpfsClient, db: &Db) {
    let chain_id = nftrout.chain_id();
    let last_seen_block = match db.with_conn(|conn| conn.last_seen_block(chain_id)).unwrap() {
        Some(n) => n,
        None => {
            let current_block = retry(|| nftrout.current_block()).await;
            db.with_conn(|conn| conn.set_last_seen_block(chain_id, current_block))
                .unwrap();
            current_block
        }
    };

    // Quickly index new and changed token metadata
    index_ownership_and_fees(nftrout, db, None).await;
    index_new_tokens(nftrout, ipfs_client, db, None).await;
    index_new_versions(nftrout, ipfs_client, db, None).await;

    let pin_fut = async {
        if timeout(PINNING_TIMEOUT, pin_cids(ipfs_client, db, None))
            .await
            .is_err()
        {
            warn!("pinning timed out");
        }
    };

    // Start watching blocks for real-time updates
    let events_fut = nftrout
        .events_from(last_seen_block)
        .buffered(25)
        .chunks(1) // set higher for greater throughput, but higher latency
        .for_each(|batch| process_token_events(nftrout, ipfs_client, db, batch));

    tokio::join!(events_fut, pin_fut);
    unreachable!("contract event stream broke");
}

#[instrument(skip_all)]
async fn index_ownership_and_fees(nftrout: &NFTroutClient, db: &Db, concurrency: Option<usize>) {
    let chain_id = nftrout.chain_id();
    let total_supply = retry(|| nftrout.total_supply()).await;
    let studs = retry(|| nftrout.studs()).await;
    let concurrency = concurrency
        .unwrap_or(INDEX_BATCH_SIZE)
        .min(u32::max_value() as usize);
    for i in (1..=total_supply).step_by(concurrency) {
        let batch = i..(i + concurrency as u32).min(total_supply + 1);
        let owners = retry(|| nftrout.owners(batch.clone())).await;
        let fees = batch.clone().map(|i| studs.get(&i).copied());
        db.with_tx(|tx| {
            tx.update_fees(chain_id, batch.clone().zip(fees))?;
            tx.update_owners(chain_id, batch.zip(owners))?;
            Ok(())
        })
        .unwrap();
    }
}

#[instrument(skip_all)]
async fn process_token_events<const N: usize>(
    nftrout: &NFTroutClient,
    ipfs_client: &IpfsClient,
    db: &Db,
    batch: Vec<smallvec::SmallVec<[Event; N]>>,
) {
    let chain_id = nftrout.chain_id();
    let mut processed_block = 0;
    let mut new_tokens: HashMap<TokenId, TroutToken> = HashMap::new();
    let mut ownership_changes: HashMap<TokenId, Address> = HashMap::new();
    let mut cid_changes: HashMap<TokenId, (Cid, TroutMetadata)> = HashMap::new();
    let mut fee_changes: HashMap<TokenId, Option<U256>> = HashMap::new();
    for event in batch.into_iter().flatten() {
        match event {
            Event::Listed { id, fee } => {
                fee_changes.insert(id, Some(fee));
                debug!(id = id, "listed token")
            }
            Event::Delisted { id } => {
                fee_changes
                    .entry(id)
                    .and_modify(|v| {
                        debug_assert!(v.is_some() && v.as_ref().unwrap().ge(&U256::zero()))
                    })
                    .insert_entry(None);
                debug!(id = id, "delisted token")
            }
            Event::Spawned { id, to } => {
                new_tokens.insert(
                    id,
                    TroutToken::pending(
                        to,
                        TroutId {
                            chain_id,
                            token_id: id,
                        },
                    ),
                );
                debug_assert!(!ownership_changes.contains_key(&id));
                ownership_changes.insert(id, to);
                debug!(id = id, "spawned token")
            }
            Event::Incubated { id } => {
                match timeout(
                    IPFS_TIMEOUT,
                    retry(|| async {
                        let cid = nftrout.token_cid(id).await?;
                        let meta = ipfs_client.dag_get_and_pin(&cid).await?;
                        Ok::<_, anyhow::Error>((cid, meta))
                    }),
                )
                .await
                {
                    Ok(change) => cid_changes.insert(id, change),
                    Err(e) => {
                        warn!("failed to index incubated token {id}: {e}");
                        continue;
                    }
                };
                debug!(id = id, "incubated token")
            }
            Event::Transfer { id, from, to } => {
                ownership_changes
                    .entry(id)
                    .and_modify(|v| debug_assert_eq!(*v, from))
                    .insert_entry(to);
                debug!(id = id, to = %to, "transferred token")
            }
            Event::ProcessedBlock(block) => {
                debug!(block = block, "processed block");
                debug_assert!(block > processed_block);
                processed_block = block;
            }
        }
    }
    db.with_tx(|tx| {
        tx.insert_tokens(new_tokens.values())?;
        tx.update_tokens(cid_changes.values())?;
        tx.update_fees(chain_id, fee_changes.into_iter())?;
        tx.update_owners(chain_id, ownership_changes.into_iter())?;
        tx.set_last_seen_block(chain_id, processed_block)?;
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
    concurrency: Option<usize>,
) {
    let latest_known_token_id = db
        .with_conn(|conn| conn.latest_known_token_id(nftrout.chain_id()))
        .unwrap()
        .unwrap_or_default();

    let total_supply = retry(|| nftrout.total_supply()).await;

    let studs = retry(|| nftrout.studs()).await;

    let concurrency = concurrency
        .unwrap_or(INDEX_BATCH_SIZE)
        .min(u32::max_value() as usize);
    for i in ((latest_known_token_id + 1)..=total_supply).step_by(concurrency) {
        let batch = i..(i + concurrency as u32).min(total_supply + 1);
        let owners = retry(|| nftrout.owners(batch.clone())).await;
        let fees = batch.clone().map(|i| studs.get(&i).copied());
        let tokens = futures::stream::iter(batch.zip(owners).zip(fees))
            .map(|((token_id, owner), fee)| async move {
                let cid = retry(|| nftrout.token_cid(token_id)).await;
                let meta = retry(|| ipfs_client.dag_get(&cid)).await;
                TroutToken {
                    cid,
                    meta,
                    owner,
                    fee,
                }
            })
            .buffer_unordered(concurrency)
            .collect::<Vec<_>>()
            .await;

        db.with_conn(|conn| conn.insert_tokens(tokens.iter()))
            .unwrap();
    }
}

#[instrument(skip_all)]
async fn index_new_versions(
    nftrout: &NFTroutClient,
    ipfs_client: &IpfsClient,
    db: &Db,
    concurrency: Option<usize>,
) {
    let chain_id = nftrout.chain_id();
    let ids_to_reindex = db
        .with_conn(|conn| conn.outdated_token_ids(chain_id))
        .unwrap();

    let concurrency = concurrency
        .unwrap_or(INDEX_BATCH_SIZE)
        .min(u32::max_value() as usize);
    for batch in ids_to_reindex.chunks(concurrency) {
        let tokens = futures::stream::iter(batch.iter().copied())
            .map(|token_id| async move {
                let cid = retry(|| nftrout.token_cid(token_id)).await;
                let meta = retry(|| ipfs_client.dag_get(&cid)).await;
                (cid, meta)
            })
            .buffer_unordered(concurrency)
            .collect::<Vec<_>>()
            .await;

        db.with_conn(|conn| conn.update_tokens(tokens.iter()))
            .unwrap();
    }
}
