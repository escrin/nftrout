use std::sync::Arc;

use tracing::trace;

#[derive(Clone, Debug, Default, PartialEq, Eq, Hash, serde::Serialize, serde::Deserialize)]
#[serde(from = "String", into = "String")]
pub struct Cid(pub String);

impl Cid {
    pub fn join(self, sub: &str) -> Self {
        let cid = self.0;
        Self(match (cid.ends_with('/'), sub.starts_with('/')) {
            (true, true) => cid + &sub[1..],
            (true, false) | (false, true) => cid + sub,
            (false, false) => cid + "/" + sub,
        })
    }
}

impl From<String> for Cid {
    fn from(cid: String) -> Self {
        Self(cid)
    }
}

impl From<&str> for Cid {
    fn from(cid: &str) -> Self {
        Self(cid.into())
    }
}

impl From<Cid> for String {
    fn from(cid: Cid) -> Self {
        cid.0
    }
}

impl std::fmt::Display for Cid {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl std::ops::Deref for Cid {
    type Target = str;
    fn deref(&self) -> &Self::Target {
        &self.0
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

    pub async fn dag_get<T: serde::de::DeserializeOwned>(&self, cid: &Cid) -> Result<T, Error> {
        trace!(cid = %cid, "dag/get");
        self.json_rpc("dag/get", [cid]).await
    }

    pub async fn cat(&self, cid: &Cid) -> Result<reqwest::Response, Error> {
        trace!(cid = %cid, "cat");
        self.rpc("cat", [cid]).await
    }

    pub async fn pin(&self, cid: &Cid) -> Result<(), Error> {
        trace!(cid = %cid, "pinning");
        self.json_rpc::<1, serde::de::IgnoredAny>("pin/add", [&cid])
            .await?;
        Ok(())
    }

    pub async fn is_pinned(&self, cid: &Cid) -> Result<bool, Error> {
        trace!(cid = %cid, "checking pin");
        let res = self.rpc::<1>("pin/ls", [&cid]).await?;
        if res.status().is_success() {
            return Ok(true);
        }
        let source = res.error_for_status_ref().unwrap_err();
        let message = res.text().await?;
        if message.contains("is not pinned") || message.contains("invalid path") {
            Ok(false)
        } else {
            Err(Error::Http {
                source,
                message: Some(message),
            })
        }
    }

    async fn json_rpc<const N: usize, T: serde::de::DeserializeOwned>(
        &self,
        method: &'static str,
        args: [&str; N],
    ) -> Result<T, Error> {
        let res = self.rpc(method, args).await?;
        if res.status().is_success() {
            Ok(res.json().await?)
        } else {
            Err(Error::Http {
                source: res.error_for_status_ref().unwrap_err(),
                message: Some(res.text().await?),
            })
        }
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
    #[error("http error: {source} {}", message.as_deref().unwrap_or_default())]
    Http {
        source: reqwest::Error,
        message: Option<String>,
    },
}

impl From<reqwest::Error> for Error {
    fn from(source: reqwest::Error) -> Self {
        Self::Http {
            source,
            message: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cid_join() {
        assert_eq!(
            Cid::from("bafyab").join("cd/ef").to_string(),
            "bafyab/cd/ef"
        );
        assert_eq!(
            Cid::from("bafyab").join("cd/ef/").to_string(),
            "bafyab/cd/ef/"
        );
        assert_eq!(
            Cid::from("bafyab").join("/cd/ef").to_string(),
            "bafyab/cd/ef"
        );
        assert_eq!(
            Cid::from("bafyab/").join("cd/ef").to_string(),
            "bafyab/cd/ef"
        );
        assert_eq!(
            Cid::from("bafyab/").join("/cd/ef").to_string(),
            "bafyab/cd/ef"
        );
    }
}
