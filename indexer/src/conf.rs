use std::time::Duration;

use serde::{
    de::{self, Deserializer},
    Deserialize,
};

#[derive(Clone, Deserialize)]
pub struct Config {
    #[serde(default = "default_api_port")]
    pub api_port: u16,

    #[serde(
        deserialize_with = "deserialize_url",
        default = "default_ipfs_endpoint"
    )]
    pub ipfs_endpoint: url::Url,

    #[serde(default = "default_db_path")]
    pub db_path: String,

    #[serde(
        deserialize_with = "deserialize_seconds",
        default = "default_reindex_interval"
    )]
    pub reindex_interval: Duration,

    #[serde(default = "default_chain")]
    pub chain: Chain,
}

impl std::fmt::Debug for Config {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let Self {
            api_port,
            ipfs_endpoint,
            db_path,
            reindex_interval,
            chain,
        } = self;
        f.debug_struct("Config")
            .field("api_port", api_port)
            .field("ipfs_endpoint", &ipfs_endpoint.to_string())
            .field("db_path", db_path)
            .field("reindex_interval", reindex_interval)
            .field("chain", chain)
            .finish()
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Hash, Deserialize)]
#[serde(rename = "kebab-case")]
pub enum Chain {
    SapphireMainnet,
    SapphireTestnet,
    Local,
}

fn deserialize_url<'de, D: Deserializer<'de>>(d: D) -> Result<url::Url, D::Error> {
    let url_str = String::deserialize(d)?;
    let url_str = if !url_str.ends_with('/') {
        format!("{url_str}/")
    } else {
        url_str
    };
    url_str.parse().map_err(de::Error::custom)
}

fn deserialize_seconds<'de, D: Deserializer<'de>>(d: D) -> Result<Duration, D::Error> {
    Ok(Duration::from_secs(<u64>::deserialize(d)?))
}

fn default_api_port() -> u16 {
    3474
}

fn default_chain() -> Chain {
    Chain::SapphireMainnet
}

fn default_ipfs_endpoint() -> url::Url {
    "http://127.0.0.1:5001/api/v0/".parse().unwrap()
}

fn default_reindex_interval() -> Duration {
    Duration::from_secs(60)
}

fn default_db_path() -> String {
    "nftrout.sqlite".into()
}
