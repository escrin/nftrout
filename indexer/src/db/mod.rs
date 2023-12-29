use std::sync::Arc;

use ethers::types::{Address, U256};
use rusqlite::OptionalExtension as _;
use tracing::{debug, warn};

use crate::{
    ipfs::Cid,
    nftrout::{
        ChainId, TokenId, TokenOwnership, TroutId, TroutMetadata, TroutToken, CURRENT_VERSION,
    },
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
        this.with_tx(|tx| tx.migrate(Self::migrations()))?;
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

    pub fn with_conn<T>(&self, f: impl FnOnce(Connection) -> Result<T, Error>) -> Result<T, Error> {
        f(Connection(&rusqlite::Connection::open(&*self.connstr)?))
    }

    pub fn with_tx<T>(&self, f: impl FnOnce(Transaction) -> Result<T, Error>) -> Result<T, Error> {
        self.with_conn(|mut conn| conn.with_tx(f))
    }

    const fn migrations() -> &'static [&'static str] {
        &[include_str!("./migrations/00-init.sql")]
    }
}

pub struct Connection<'a>(&'a rusqlite::Connection);

impl Connection<'_> {
    pub fn with_tx<T>(
        &mut self,
        f: impl FnOnce(Transaction) -> Result<T, Error>,
    ) -> Result<T, Error> {
        let tx = self.0.unchecked_transaction()?;
        let res = f(Transaction(Connection(&tx)))?;
        tx.commit()?;
        Ok(res)
    }
}

pub struct Transaction<'a>(Connection<'a>);

impl<'a> std::ops::Deref for Transaction<'a> {
    type Target = Connection<'a>;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl Transaction<'_> {
    fn migrate(&self, migrations: &[&str]) -> Result<(), Error> {
        let tx = &self.0 .0;
        static USER_VERSION: &str = "user_version";
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
    }
}

impl Connection<'_> {
    pub fn last_seen_block(&self, chain_id: ChainId) -> Result<Option<u64>, Error> {
        self.0
            .query_row(
                "SELECT block FROM progress WHERE chain = ?",
                [chain_id],
                |row| row.get::<_, i64>(0).map(|i| i as u64),
            )
            .optional()
            .map_err(Into::into)
    }

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

    pub fn list_token_ownership(&self, chain_id: ChainId) -> Result<Vec<TokenOwnership>, Error> {
        self.0
            .prepare("SELECT self_id, owner, fee FROM tokens WHERE self_chain = ?")?
            .query_map([chain_id], |row| {
                Ok(TokenOwnership {
                    id: row.get("self_id")?,
                    owner: row.get::<_, String>("owner")?.parse().unwrap(),
                    fee: row
                        .get::<_, Option<String>>("fee")?
                        .map(|f| f.parse().unwrap()),
                })
            })?
            .collect::<Result<Vec<_>, _>>()
            .map_err(Into::into)
    }

    pub fn set_last_seen_block(&self, chain: ChainId, block: u64) -> Result<(), Error> {
        let changes = self.0.execute(
            "INSERT INTO progress (chain, block) VALUES(?1, ?2)
             ON CONFLICT DO UPDATE set block = ?2",
            (chain, block),
        )?;
        debug_assert_eq!(changes, 1);
        Ok(())
    }

    pub fn insert_tokens(&self, tokens: impl Iterator<Item = &TroutToken>) -> Result<(), Error> {
        let mut token_inserter = self.0.prepare_cached(
            r#"
            INSERT INTO tokens (
                self_chain, self_id,
                version, name,
                owner, fee,
                is_genesis, is_santa,
                left_parent_chain, left_parent_id,
                right_parent_chain, right_parent_id
            ) VALUES (
            ?, ?,
            ?, ?,
            ?, ?,
            ?, ?,
            ?, ?,
            ?, ?
            )
            "#,
        )?;
        let mut generation_inserter = self.0.prepare_cached(
            r#"INSERT OR IGNORE INTO generations (token, ord, cid) VALUES (?, ?, ?)"#,
        )?;
        for token in tokens {
            let props = &token.meta.properties;
            let token_rowid = token_inserter.insert((
                props.self_id.chain_id,
                props.self_id.token_id,
                props.version,
                &token.meta.name,
                format!("{:#x}", token.owner),
                token.fee.map(|f| format!("{f:#x}")),
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
    }

    pub fn update_tokens(
        &self,
        tokens: impl Iterator<Item = &(Cid, TroutMetadata)>,
    ) -> Result<(), Error> {
        let mut token_updater = self.0.prepare_cached(
            r#"UPDATE tokens SET version = ? WHERE self_chain = ? AND self_id = ?"#,
        )?;
        let mut generation_inserter = self.0.prepare_cached(
            r#"INSERT OR IGNORE INTO generations (token, ord, cid) VALUES (?, ?, ?)"#,
        )?;
        for (cid, meta) in tokens {
            let props = &meta.properties;
            let token_rowid = token_updater.execute((
                CURRENT_VERSION,
                props.self_id.chain_id,
                props.self_id.token_id,
            ))?;
            generation_inserter.insert((token_rowid, props.generations.len(), &**cid))?;
            for (ord, generation) in props.generations.iter().enumerate() {
                generation_inserter.insert((token_rowid, ord, &**generation))?;
            }
        }
        Ok(())
    }

    pub fn update_fees(
        &self,
        chain_id: ChainId,
        tokens: impl Iterator<Item = (TokenId, Option<U256>)>,
    ) -> Result<(), Error> {
        let mut fee_updater = self
            .0
            .prepare_cached(r#"UPDATE tokens SET fee = ? WHERE self_chain = ? AND self_id = ?"#)?;
        for (token_id, fee) in tokens {
            fee_updater.execute((fee.map(|f| format!("{f:x}")), chain_id, token_id))?;
        }
        Ok(())
    }

    pub fn update_owners(
        &self,
        chain: ChainId,
        token_owners: impl Iterator<Item = (TokenId, Address)>,
    ) -> Result<(), Error> {
        let mut updater = self.0.prepare_cached(
            r#"UPDATE tokens SET owner = ? WHERE self_chain = ? AND self_id = ?"#,
        )?;
        for (token_id, owner) in token_owners {
            updater.execute((format!("{owner:x}"), chain, token_id))?;
        }
        Ok(())
    }

    pub fn mark_pinned<'a>(&self, cids: impl Iterator<Item = &'a Cid>) -> Result<(), Error> {
        let mut updater = self
            .0
            .prepare_cached(r#"UPDATE generations SET pinned = 1 WHERE cid = ?"#)?;
        for cid in cids {
            updater.execute([&**cid])?;
        }
        Ok(())
    }

    pub fn mark_pin_failed<'a>(&self, cids: impl Iterator<Item = &'a Cid>) -> Result<(), Error> {
        let mut updater = self
            .0
            .prepare_cached(r#"UPDATE generations SET pin_fails = pin_fails + 1 WHERE cid = ?"#)?;
        for cid in cids {
            updater.execute([&**cid])?;
        }
        Ok(())
    }
}

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("database driver error: {0}")]
    Driver(#[from] rusqlite::Error),
}
