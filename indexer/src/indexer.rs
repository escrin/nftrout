use anyhow::Result;
use futures::{StreamExt, TryStreamExt};
use tokio::time::{timeout, Duration};
use tracing::{debug, error, instrument, warn};

use crate::{
    db::Db,
    ipfs::Client as IpfsClient,
    nftrout::{Client as NFTroutClient, TokenId, TroutToken},
};

const INDEX_BATCH_SIZE: usize = 50;
const PIN_BATCH_SIZE: usize = 50;

#[instrument(skip_all)]
pub async fn run(nftrout_client: &NFTroutClient, ipfs_client: &IpfsClient, db: &Db) -> Result<()> {
    let total_supply = nftrout_client.total_supply().await?;
    let chain_id = nftrout_client.chain_id().await?;
    let (latest_known_token_id, ids_to_reindex) = db.with_conn(|conn| {
        Ok((
            conn.latest_known_token_id(chain_id)?.unwrap_or_default(),
            conn.outdated_token_ids(chain_id)?,
        ))
    })?;

    let ids_to_index = (latest_known_token_id + 1)..=total_supply;
    debug!(
        reindex_count = ids_to_reindex.len(),
        new_index_count = (total_supply - latest_known_token_id),
        "indexing"
    );
    index_tokens(
        ids_to_reindex
            .into_iter()
            .chain(ids_to_index)
            .map(|token_id| TokenId { chain_id, token_id }),
        nftrout_client,
        ipfs_client,
        db,
        None,
    )
    .await
    .map_err(|e| error!("indexing failed: {e}"))
    .ok();
    debug!("finished indexing");

    timeout(
        Duration::from_secs(5 * 60),
        pin_cids(ipfs_client, db, None),
    )
    .await
    .map_err(|_| warn!("pinning timed out"))
    .unwrap_or(Ok(()))?;

    Ok(())
}

#[instrument(skip_all)]
async fn pin_cids(ipfs_client: &IpfsClient, db: &Db, concurrency: Option<usize>) -> Result<()> {
    let cids_to_pin = db.with_conn(|conn| conn.unpinned_cids())?;
    debug!(count = cids_to_pin.len(), "pinning cids");
    let concurrency = concurrency.unwrap_or(PIN_BATCH_SIZE);
    futures::stream::iter(cids_to_pin)
        .map(|cid| async move {
            match timeout(Duration::from_secs(60), ipfs_client.pin(&cid)).await {
                Err(_) => warn!("failed to pin {cid}: timed out"),
                Ok(Err(e)) => warn!("failed to pin {cid}: {e}"),
                Ok(Ok(_)) => return Ok(cid),
            }
            Err(cid)
        })
        .buffer_unordered(concurrency)
        .ready_chunks(concurrency)
        .map(Ok::<_, anyhow::Error>)
        .try_for_each(|mut cids| async move {
            let pp = cids.iter_mut().partition_in_place(|c| c.is_ok());
            Ok(db.with_conn(|mut conn| {
                conn.mark_pinned(cids[..pp].iter().map(|c| c.as_ref().unwrap()))?;
                conn.mark_pin_failed(cids[pp..].iter().map(|c| c.as_ref().unwrap_err()))?;
                Ok(())
            })?)
        })
        .await?;
    debug!("finished pinning");
    Ok(())
}

#[instrument(skip_all)]
async fn index_tokens(
    mut tokens: impl Iterator<Item = TokenId>,
    nftrout_client: &NFTroutClient,
    ipfs_client: &IpfsClient,
    db: &Db,
    concurrency: Option<usize>,
) -> Result<()> {
    loop {
        let tokens = futures::stream::iter(tokens.by_ref().take(INDEX_BATCH_SIZE))
            .map(Ok::<_, anyhow::Error>)
            .map_ok(|TokenId { token_id, .. }| async move {
                let cid = nftrout_client.token_cid(token_id).await?;
                let meta = ipfs_client.dag_get(&cid).await?;
                Ok(TroutToken { cid, meta })
            })
            .try_buffer_unordered(concurrency.unwrap_or(25))
            .try_collect::<Vec<_>>()
            .await?;

        if tokens.is_empty() {
            break;
        }

        db.with_conn(|mut conn| conn.insert_tokens(&tokens))?;
    }
    Ok(())
}
