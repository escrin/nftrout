use std::sync::Arc;

use ethers::{
    providers::{Http, Middleware as _, Provider},
    types::Address,
};

use crate::ipfs::Cid;

pub const CURRENT_VERSION: u64 = 3;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("contract call error: {0}")]
    Contract(#[from] ethers::contract::ContractError<Provider<Http>>),
    #[error("provider error: {0}")]
    Provider(#[from] ethers::providers::ProviderError),
    #[error("token {0} did not have a URI")]
    NoUri(u64),
}

ethers::contract::abigen!(NFTrout, "src/nftrout/abi.json");

#[derive(Clone, Debug)]
pub struct TroutToken {
    pub cid: Cid,
    pub meta: TroutMetadata,
}

#[derive(Clone, Debug, serde::Deserialize)]
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

#[derive(Clone, Debug, serde::Deserialize)]
pub struct TroutProperties {
    pub version: u64,
    pub generations: Vec<Cid>,
    pub left: Option<TokenId>,
    pub right: Option<TokenId>,
    #[serde(rename = "self")]
    pub self_id: TokenId,
    pub attributes: TroutAttributes,
}

#[derive(Clone, Debug, serde::Deserialize)]
pub struct TroutAttributes {
    pub genesis: bool,
    pub santa: bool,
}

#[derive(Clone, Copy, Debug, serde::Deserialize)]
pub struct TokenId {
    #[serde(rename = "chainId")]
    pub chain_id: u64,
    #[serde(rename = "tokenId")]
    pub token_id: u64,
}

#[derive(Clone)]
pub struct Client {
    inner: NFTrout<Provider<Http>>,
    provider: Arc<Provider<Http>>,
}

impl Client {
    pub fn sapphire_mainnet() -> Self {
        Self::from_static(
            "0x998633BDF6eE32A9CcA6c9A247F428596e8e65d8",
            "https://sapphire.oasis.io",
        )
    }

    pub fn sapphire_testnet() -> Self {
        Self::from_static(
            "0xF8E3DE55D24D13607A12628E0A113B66BA578bDC",
            "https://testnet.sapphire.oasis.dev",
        )
    }

    pub fn local() -> Self {
        Self::from_static(
            "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
            "http://127.0.0.1:8545",
        )
    }

    fn from_static(addr: &'static str, gw_url: &'static str) -> Self {
        Self::new(addr.parse().unwrap(), gw_url.parse().unwrap())
    }

    pub fn new(addr: Address, gw_url: url::Url) -> Self {
        let polling_interval = std::time::Duration::from_millis(3000);
        let provider = Arc::new(Provider::new(Http::new(gw_url)).interval(polling_interval));
        Self {
            inner: NFTrout::new(addr, provider.clone()),
            provider,
        }
    }

    pub async fn total_supply(&self) -> Result<u64, Error> {
        Ok(self.inner.total_supply().call().await?.low_u64())
    }

    pub async fn token_cid(&self, token_id: u64) -> Result<Cid, Error> {
        let uri = self.inner.token_uri(token_id.into()).call().await?;
        let cid = uri.strip_prefix("ipfs://").expect("not IPFS uri");
        if cid.is_empty() {
            return Err(Error::NoUri(token_id));
        }
        Ok(cid.to_string().into())
    }

    pub async fn chain_id(&self) -> Result<u64, Error> {
        Ok(self.provider.get_chainid().await?.low_u64())
    }
}
