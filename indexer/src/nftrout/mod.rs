use std::{collections::HashMap, sync::Arc};

use async_stream::stream;
use ethers::{
    contract::EthLogDecode as _,
    providers::{Http, Middleware, Provider},
    types::{Address, BlockId, BlockNumber, Filter, Log, ValueOrArray, U256},
};
use futures::{future::BoxFuture, FutureExt as _, Stream};
use serde::{Deserialize, Serialize};
use smallvec::{smallvec, SmallVec};
use tracing::{error, trace, warn};

use crate::{
    ipfs::Cid,
    utils::{retry, retry_if},
};

pub const CURRENT_VERSION: u32 = 3;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("contract call error: {0}")]
    Contract(#[from] ethers::contract::ContractError<Provider<Http>>),
    #[error("provider error: {0}")]
    Provider(#[from] ethers::providers::ProviderError),
}

ethers::contract::abigen!(NFTrout, "src/nftrout/abi.json");

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct TroutToken {
    pub cid: Cid,
    pub meta: TroutMetadata,
    pub owner: Address,
    pub fee: Option<U256>,
}

impl TroutToken {
    pub fn pending(owner: Address, id: TroutId) -> Self {
        TroutToken {
            owner,
            meta: TroutMetadata {
                properties: TroutProperties {
                    self_id: id,
                    ..Default::default()
                },
                ..Default::default()
            },
            ..Default::default()
        }
    }
}

/// The details of a token that are necessary for the UI.
#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct TokenOwnership {
    pub id: TokenId,
    pub owner: Address,
    pub fee: Option<U256>,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct TroutMetadata {
    pub description: String,
    #[serde(deserialize_with = "deserialized_slash_cid")]
    pub image: Cid,
    #[serde(rename = "metadata.json", deserialize_with = "deserialized_slash_cid")]
    pub metadata: Cid,
    pub name: String,
    pub properties: TroutProperties,
}

fn deserialized_slash_cid<'de, D: serde::de::Deserializer<'de>>(d: D) -> Result<Cid, D::Error> {
    #[derive(serde::Deserialize)]
    struct Slashed {
        #[serde(rename = "/")]
        value: Cid,
    }
    Ok(<Slashed as serde::Deserialize>::deserialize(d)?.value)
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct TroutProperties {
    pub version: TokenVersion,
    pub generations: Vec<Cid>,
    pub left: Option<TroutId>,
    pub right: Option<TroutId>,
    #[serde(rename = "self")]
    pub self_id: TroutId,
    pub attributes: TroutAttributes,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct TroutAttributes {
    pub genesis: bool,
    pub santa: bool,
}

pub type ChainId = u32;
pub type TokenId = u32;
pub type TokenVersion = u32;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct TroutId {
    #[serde(rename = "chainId")]
    pub chain_id: ChainId,
    #[serde(rename = "tokenId")]
    pub token_id: TokenId,
}

#[derive(Clone)]
pub struct Client {
    addr: Address,
    chain: ChainId,
    inner: NFTrout<Provider<Http>>,
    provider: Arc<Provider<Http>>,
    block: BlockId,
}

impl Client {
    pub fn sapphire_mainnet() -> Self {
        Self::from_static(
            0x5afe,
            "0x998633BDF6eE32A9CcA6c9A247F428596e8e65d8",
            "https://sapphire.oasis.io",
        )
    }

    pub fn sapphire_testnet() -> Self {
        Self::from_static(
            0x5aff,
            "0xF8E3DE55D24D13607A12628E0A113B66BA578bDC",
            "https://testnet.sapphire.oasis.dev",
        )
    }

    pub fn local() -> Self {
        Self::from_static(
            31337,
            "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
            "http://127.0.0.1:8545",
        )
    }

    fn from_static(chain: ChainId, addr: &'static str, gw_url: &'static str) -> Self {
        Self::new(chain, addr.parse().unwrap(), gw_url.parse().unwrap())
    }

    pub fn new(chain: ChainId, addr: Address, gw_url: url::Url) -> Self {
        let polling_interval = std::time::Duration::from_millis(3000);
        let provider = Arc::new(Provider::new(Http::new(gw_url)).interval(polling_interval));
        Self {
            chain,
            addr,
            inner: NFTrout::new(addr, provider.clone()),
            provider,
            block: BlockNumber::Finalized.into(),
        }
    }

    pub fn at_block(&self, block: u64) -> Self {
        Self {
            block: BlockNumber::Number(block.into()).into(),
            ..self.clone()
        }
    }

    pub async fn total_supply(&self) -> Result<TokenId, Error> {
        Ok(self
            .inner
            .total_supply()
            .block(self.block)
            .call()
            .await?
            .low_u32())
    }

    pub async fn studs(&self) -> Result<HashMap<TokenId, U256>, Error> {
        Ok(self
            .inner
            .get_studs(0.into(), U256::max_value())
            .block(self.block)
            .call()
            .await?
            .into_iter()
            .map(|stud| (stud.token_id.as_u32(), stud.fee))
            .collect())
    }

    pub async fn token_cid(&self, token_id: TokenId) -> Result<Option<Cid>, Error> {
        let uri = self
            .inner
            .token_uri(token_id.into())
            .block(self.block)
            .call()
            .await?;
        let cid = uri.strip_prefix("ipfs://").expect("not IPFS uri");
        if cid.is_empty() {
            return Ok(None);
        }
        Ok(Some(cid.to_string().into()))
    }

    pub async fn owners(
        &self,
        token_ids: impl Iterator<Item = TokenId>,
    ) -> Result<Vec<Address>, Error> {
        Ok(self
            .inner
            .explicit_ownerships_of(token_ids.map(U256::from).collect())
            .block(self.block)
            .call()
            .await?
            .into_iter()
            .map(|o| o.addr)
            .collect())
    }

    pub fn chain_id(&self) -> ChainId {
        self.chain
    }

    pub async fn latest_block(&self) -> Result<u64, Error> {
        Ok(self.provider.get_block_number().await?.as_u64())
    }

    pub fn events_from(
        &self,
        start_block: u64,
    ) -> impl Stream<Item = BoxFuture<SmallVec<[Event; 4]>>> {
        stream!({
            for await block in self.blocks(start_block).await {
                yield self.get_block_events(block, self.addr).boxed();
                yield futures::future::ready(smallvec![Event::ProcessedBlock(block)]).boxed();
            }
        })
    }

    async fn blocks(&self, start_block: u64) -> impl Stream<Item = u64> + '_ {
        let init_block =
            retry(|| async { Ok::<_, Error>(self.provider.get_block_number().await?.as_u64()) })
                .await;
        stream!({
            let mut current_block = start_block;
            loop {
                if current_block <= init_block {
                    yield current_block;
                } else {
                    self.wait_for_block(current_block).await;
                    yield current_block;
                }
                current_block += 1;
            }
        })
    }

    async fn wait_for_block(&self, block_number: u64) {
        trace!(block = block_number, "waiting for block");
        retry_if(
            || async { Ok::<_, Error>(self.provider.get_block_number().await?.as_u64()) },
            |num| (num >= block_number).then_some(num),
        )
        .await;
        trace!(block = block_number, "waited for block");
    }

    async fn get_block_events(&self, block_number: u64, addr: Address) -> SmallVec<[Event; 4]> {
        retry(move || {
            let provider = self.provider.clone();
            let filter = Filter::new()
                .select(block_number)
                .address(ValueOrArray::Value(addr));
            async move { provider.get_logs(&filter).await }
        })
        .await
        .into_iter()
        .filter_map(|log| self.decode_log(log))
        .collect::<SmallVec<[Event; 4]>>()
    }

    fn decode_log(&self, log: Log) -> Option<Event> {
        if log.block_number.is_none() || log.removed == Some(true) {
            return None;
        }
        let raw_log = (log.topics, log.data.to_vec()).into();
        let event = NFTroutEvents::decode_log(&raw_log)
            .map_err(|e| warn!("failed to decode log: {e}"))
            .ok()?;
        Some(match event {
            NFTroutEvents::ConsecutiveTransferFilter(_) => unimplemented!("ConsecutiveTransfer"),
            NFTroutEvents::DelistedFilter(f) => Event::Delisted {
                id: f.token_id.as_u32(),
            },
            NFTroutEvents::IncubatedFilter(f) => Event::Incubated {
                id: f.token_id.as_u32(),
            },
            NFTroutEvents::ListedFilter(f) => Event::Listed {
                id: f.token_id.as_u32(),
                fee: f.fee,
            },
            NFTroutEvents::TransferFilter(f) if f.from.is_zero() => Event::Spawned {
                id: f.token_id.as_u32(),
                to: f.to,
            },
            NFTroutEvents::TransferFilter(f) => Event::Transfer {
                id: f.token_id.as_u32(),
                from: f.from,
                to: f.to,
            },
            _ => return None,
        })
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Event {
    ProcessedBlock(u64),
    Listed {
        id: TokenId,
        fee: U256,
    },
    Delisted {
        id: TokenId,
    },
    Spawned {
        id: TokenId,
        to: Address,
    },
    Incubated {
        id: TokenId,
    },
    Transfer {
        id: TokenId,
        from: Address,
        to: Address,
    },
}
