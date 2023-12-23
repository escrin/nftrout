use std::sync::Arc;

use crate::{
    ipfs::Cid,
    nftrout::{TokenId, TroutToken},
};

#[derive(Clone)]
pub struct Db {
    connstr: Arc<String>,
}

impl Db {
    pub fn open(connstr: impl Into<String>) -> Result<Self, Error> {
        let this = Self {
            connstr: Arc::new(connstr.into()),
        };
        this.with_conn(|mut conn| {
            conn.0.pragma_update(None, "journal_mode", "WAL")?;
            conn.migrate(Self::migrations())
        })?;
        Ok(this)
    }

    pub fn with_conn<T>(
        &self,
        f: impl FnOnce(DbConnection) -> Result<T, Error>,
    ) -> Result<T, Error> {
        f(DbConnection(rusqlite::Connection::open(&*self.connstr)?))
    }

    const fn migrations() -> &'static [&'static str] {
        &[include_str!("./migrations/00-init.sql")]
    }
}

pub struct DbConnection(rusqlite::Connection);

impl DbConnection {
    fn migrate(&mut self, migrations: &[&str]) -> Result<(), Error> {
        static USER_VERSION: &str = "user_version";
        let tx = self.0.transaction()?;
        let version =
            tx.pragma_query_value(None, USER_VERSION, |row| row.get::<_, u32>(0))? as usize;
        eprintln!("version {version}");
        eprintln!("migrations {}", migrations.len());
        if version >= migrations.len() {
            if version > migrations.len() {
                tracing::warn!("databse version unexpectedly high?");
            }
            return Ok(());
        }
        for migration in migrations.iter().skip(version) {
            tx.execute_batch(migration)?;
        }
        tx.pragma_update(None, USER_VERSION, migrations.len())?;
        tx.commit()?;
        Ok(())
    }
}

impl DbConnection {
    pub fn latest_known_token_id(&self, chain_id: u64) -> Result<Option<u64>, Error> {
        self.0
            .query_row(
                "SELECT MAX(self_id) FROM tokens WHERE self_chain = ?",
                [chain_id],
                |row| row.get::<_, Option<u64>>(0),
            )
            .map_err(Into::into)
    }

    pub fn outdated_token_ids(&self, chain_id: u64) -> Result<Vec<u64>, Error> {
        self.0
            .prepare("SELECT self_id FROM tokens WHERE self_chain = ? AND version < ? LIMIT 1000")?
            .query_map([chain_id, crate::nftrout::CURRENT_VERSION], |row| {
                row.get::<_, u64>(0)
            })?
            .collect::<Result<Vec<u64>, _>>()
            .map_err(Into::into)
    }

    pub fn token_image_cid(
        &self,
        TokenId { chain_id, token_id }: TokenId,
    ) -> Result<Option<Cid>, Error> {
        self.0
            .query_row(
                "SELECT image_cid FROM tokens WHERE self_chain = ? AND self_id = ?",
                [chain_id, token_id],
                |row| row.get::<_, Option<String>>(0).map(|s| s.map(Cid::from)),
            )
            .map_err(Into::into)
    }
}

impl DbConnection {
    pub fn insert_tokens(&self, tokens: &[TroutToken]) -> Result<(), Error> {
        let mut inserter = self.0.prepare_cached(
            r#"
            INSERT INTO tokens (
                self_chain, self_id,
                token_cid, image_cid,
                name, is_genesis, is_santa,
                version, generations,
                left_parent_chain, left_parent_id,
                right_parent_chain, right_parent_id
            ) VALUES (
                ?, ?,
                ?, ?,
                ?, ?, ?,
                ?, ?,
                ?, ?,
                ?, ?
            )
        "#,
        )?;

        for token in tokens {
            inserter.insert(rusqlite::params![
                token.meta.properties.self_id.chain_id,
                token.meta.properties.self_id.token_id,
                token.cid.0,
                token.meta.image.0,
                token.meta.name,
                token.meta.properties.attributes.genesis,
                token.meta.properties.attributes.santa,
                token.meta.properties.version,
                serde_json::to_string(&token.meta.properties.generations).unwrap(),
                token.meta.properties.left.map(|token_id| token_id.chain_id),
                token.meta.properties.left.map(|token_id| token_id.token_id),
                token
                    .meta
                    .properties
                    .right
                    .map(|token_id| token_id.chain_id),
                token
                    .meta
                    .properties
                    .right
                    .map(|token_id| token_id.token_id),
            ])?;
        }

        Ok(())
    }
}

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("database driver error: {0}")]
    Driver(#[from] rusqlite::Error),
}
