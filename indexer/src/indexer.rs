use anyhow::Result;
use futures::{StreamExt, TryStreamExt as _};
use tracing::{debug, debug_span, error, instrument, Instrument as _};

use crate::{
    db::Db,
    ipfs::Client as IpfsClient,
    nftrout::{Client as NFTroutClient, TokenId, TroutToken},
};

const BATCH_SIZE: usize = 50;

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
    .await?;
    debug!("finished indexing");

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
        let tokens = futures::stream::iter(tokens.by_ref().take(BATCH_SIZE))
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

        let pin_client = ipfs_client.clone();
        let cids = tokens
            .iter()
            .flat_map(|token| [token.cid.clone(), token.meta.image.clone()])
            .collect::<Vec<_>>();
        let pin_span = debug_span!("pin_span", count = cids.len());
        tokio::task::spawn(
            async move {
                futures::stream::iter(cids.iter())
                    .map(Ok::<_, anyhow::Error>)
                    .try_for_each_concurrent(5, |cid| async {
                        pin_client.pin(cid).await?;
                        Ok(())
                    })
                    .await
                    .map_err(|e| error!("failed to pin: {e}"))
                    .ok();
            }
            .instrument(pin_span),
        );

        db.with_conn(|conn| conn.insert_tokens(&tokens))?;
    }
    Ok(())
}
