use std::sync::Arc;

use rusqlite::OptionalExtension as _;
use tracing::{debug, warn};

use crate::{
    ipfs::Cid,
    nftrout::{ChainId, TokenId, TroutId, TroutToken},
};

#[cfg(test)]
mod tests;

#[derive(Clone)]
pub struct Db {
    connstr: Arc<String>,
}

impl Db {
    pub fn open(connstr: String) -> Result<Self, Error> {
        let this = Self {
            connstr: Arc::new(connstr),
        };
        this.with_conn(|mut conn| {
            conn.0.pragma_update(None, "journal_mode", "WAL")?;
            conn.migrate(Self::migrations())
        })?;
        Ok(this)
    }

    #[cfg(test)]
    pub fn open_in_memory() -> Result<Self, Error> {
        let mut rng = rand::thread_rng();
        let db_name = (0..7)
            .map(|_| rand::Rng::sample(&mut rng, rand::distributions::Alphanumeric) as char)
            .collect::<String>();
        let connstr = format!("file:{db_name}?mode=memory&cache=shared");
        Box::leak(Box::new(rusqlite::Connection::open(&connstr)?));
        Self::open(connstr)
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
        self.tx(|tx| {
            let version =
                tx.pragma_query_value(None, USER_VERSION, |row| row.get::<_, u32>(0))? as usize;
            debug!(
                current_version = version,
                latest_version = migrations.len(),
                "DbConnection::migrate"
            );
            if version >= migrations.len() {
                if version > migrations.len() {
                    warn!("databse version unexpectedly high?");
                }
                return Ok(());
            }
            for migration in migrations.iter().skip(version) {
                tx.execute_batch(migration)?;
            }
            tx.pragma_update(None, USER_VERSION, migrations.len())?;
            Ok(())
        })
    }

    fn tx<T>(
        &mut self,
        f: impl FnOnce(&rusqlite::Transaction) -> Result<T, Error>,
    ) -> Result<T, Error> {
        let tx = self.0.transaction()?;
        let res = f(&tx)?;
        tx.commit()?;
        Ok(res)
    }
}

impl DbConnection {
    pub fn latest_known_token_id(&self, chain_id: ChainId) -> Result<Option<TokenId>, Error> {
        self.0
            .query_row(
                "SELECT MAX(self_id) FROM tokens WHERE self_chain = ?",
                [chain_id],
                |row| row.get::<_, Option<TokenId>>(0),
            )
            .map_err(Into::into)
    }

    pub fn outdated_token_ids(&self, chain_id: ChainId) -> Result<Vec<TokenId>, Error> {
        self.0
            .prepare("SELECT self_id FROM tokens WHERE self_chain = ? AND version < ? LIMIT 1000")?
            .query_map([chain_id, crate::nftrout::CURRENT_VERSION], |row| {
                row.get::<_, TokenId>(0)
            })?
            .collect::<Result<Vec<_>, _>>()
            .map_err(Into::into)
    }

    pub fn unpinned_cids(&self) -> Result<Vec<Cid>, Error> {
        self.0
            .prepare("SELECT cid FROM generations WHERE pinned = 0 AND pin_fails < 10")?
            .query_map([], |row| row.get::<_, String>(0).map(Into::into))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(Into::into)
    }

    pub fn token_cid(
        &self,
        TroutId { chain_id, token_id }: &TroutId,
        ord: Option<u32>,
    ) -> Result<Option<Cid>, Error> {
        self.0
            .query_row(
                r#"
                SELECT generations.cid FROM generations
                JOIN tokens ON tokens.id = generations.token
                WHERE tokens.self_chain = ?
                AND tokens.self_id = ?
                AND generations.ord = coalesce(
                        ?,
                        (SELECT MAX(ord) FROM generations WHERE generations.token = tokens.id)
                    )
                "#,
                (chain_id, token_id, ord),
                |row| row.get::<_, String>(0).map(Into::into),
            )
            .optional()
            .map_err(Into::into)
    }
}

impl DbConnection {
    pub fn insert_tokens(&mut self, tokens: &[TroutToken]) -> Result<(), Error> {
        self.tx(|tx| {
            let mut token_inserter = tx.prepare_cached(
                r#"
                INSERT INTO tokens (
                    self_chain, self_id,
                    version, name,
                    is_genesis, is_santa,
                    left_parent_chain, left_parent_id,
                    right_parent_chain, right_parent_id
                ) VALUES (
                    ?, ?,
                    ?, ?,
                    ?, ?,
                    ?, ?,
                    ?, ?
                )
            "#,
            )?;
            let mut generation_inserter = tx.prepare_cached(
                r#"INSERT OR IGNORE INTO generations (token, ord, cid) VALUES (?, ?, ?)"#,
            )?;
            for token in tokens {
                let props = &token.meta.properties;
                let token_rowid = token_inserter.insert((
                    props.self_id.chain_id,
                    props.self_id.token_id,
                    props.version,
                    &token.meta.name,
                    props.attributes.genesis,
                    props.attributes.santa,
                    props.left.map(|token_id| token_id.chain_id),
                    props.left.map(|token_id| token_id.token_id),
                    props.right.map(|token_id| token_id.chain_id),
                    props.right.map(|token_id| token_id.token_id),
                ))?;
                generation_inserter.insert((token_rowid, props.generations.len(), &*token.cid))?;
                for (ord, generation) in props.generations.iter().enumerate() {
                    generation_inserter.insert((token_rowid, ord, &**generation))?;
                }
            }
            Ok(())
        })
    }

    pub fn mark_pinned<'a>(&mut self, cids: impl Iterator<Item = &'a Cid>) -> Result<(), Error> {
        self.tx(|tx| {
            let mut updater =
                tx.prepare_cached(r#"UPDATE generations SET pinned = 1 WHERE cid = ?"#)?;
            for cid in cids {
                updater.execute([&**cid])?;
            }
            Ok(())
        })
    }

    pub fn mark_pin_failed<'a>(
        &mut self,
        cids: impl Iterator<Item = &'a Cid>,
    ) -> Result<(), Error> {
        self.tx(|tx| {
            let mut updater = tx.prepare_cached(
                r#"UPDATE generations SET pin_fails = pin_fails + 1 WHERE cid = ?"#,
            )?;
            for cid in cids {
                updater.execute([&**cid])?;
            }
            Ok(())
        })
    }
}

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("database driver error: {0}")]
    Driver(#[from] rusqlite::Error),
}
