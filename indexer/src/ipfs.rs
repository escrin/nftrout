use std::sync::Arc;

use tracing::trace;

use crate::nftrout::TroutMetadata;

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(from = "String", into = "String")]
pub struct Cid(pub String);

impl From<String> for Cid {
    fn from(cid: String) -> Self {
        Self(cid)
    }
}

impl From<Cid> for String {
    fn from(cid: Cid) -> Self {
        cid.0
    }
}

#[derive(Clone, Debug)]
pub struct Client {
    endpoint: Arc<url::Url>,
    http: reqwest::Client,
}

impl Default for Client {
    fn default() -> Self {
        Self::new("http://127.0.0.1:5001/api/v0/".parse().unwrap())
    }
}

impl Client {
    pub fn new(endpoint: url::Url) -> Self {
        Self {
            endpoint: Arc::new(endpoint),
            http: Default::default(),
        }
    }

    #[tracing::instrument(level = "trace")]
    pub async fn dag_get(&self, cid: &Cid) -> Result<TroutMetadata, Error> {
        self.json_rpc("dag/get", [&cid.0]).await
    }

    #[tracing::instrument(level = "trace")]
    pub async fn cat(&self, cid: &Cid) -> Result<reqwest::Response, Error> {
        self.rpc("cat", [&cid.0]).await
    }

    #[tracing::instrument(level = "trace")]
    pub async fn pin(&self, cid: &Cid) -> Result<(), Error> {
        trace!(cid = cid.0, "pinning");
        self.json_rpc::<1, serde::de::IgnoredAny>("pin/add", [&cid.0])
            .await?;
        Ok(())
    }

    async fn json_rpc<const N: usize, T: serde::de::DeserializeOwned>(
        &self,
        method: &'static str,
        args: [&str; N],
    ) -> Result<T, Error> {
        Ok(self
            .rpc(method, args)
            .await?
            .error_for_status()?
            .json()
            .await?)
    }

    async fn rpc<const N: usize>(
        &self,
        method: &'static str,
        args: [&str; N],
    ) -> Result<reqwest::Response, Error> {
        self.http
            .post(self.endpoint.join(method).unwrap())
            .query(args.map(|arg| ("arg", arg)).as_slice())
            .send()
            .await
            .map_err(Into::into)
    }
}

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("http error: {0}")]
    Http(#[from] reqwest::Error),
}
