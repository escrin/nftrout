use std::sync::Arc;

use ethers::types::{Address, U256};
use rusqlite::OptionalExtension as _;
use tracing::debug;

use crate::{
    ipfs::Cid,
    nftrout::{ChainId, PendingToken, TokenForUi, TokenId, TroutId, TroutToken},
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
    fn migrate(&self, migrations: &[&str]) -> Result<usize, Error> {
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
                panic!("databse version unexpectedly high?");
            }
            return Ok(version);
        }
        for migration in migrations.iter().skip(version) {
            tx.execute_batch(migration)?;
        }
        tx.pragma_update(None, USER_VERSION, migrations.len())?;
        Ok(version)
    }
}

impl Connection<'_> {
    pub fn latest_known_token_id(&self, chain_id: ChainId) -> Result<Option<TokenId>, Error> {
        self.0
            .query_row(
                "SELECT MAX(self_id) FROM tokens WHERE self_chain = ?",
                [chain_id],
                |row| row.get::<_, Option<TokenId>>(0),
            )
            .map_err(Into::into)
    }

    pub fn token_ids(&self, chain_id: ChainId) -> Result<Vec<TokenId>, Error> {
        self.0
            .prepare("SELECT self_id FROM tokens WHERE self_chain = ? ORDER BY self_id ASC")?
            .query_map([chain_id], |row| row.get::<_, TokenId>(0))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(Into::into)
    }

    pub fn needs_coi_analysis(&self) -> Result<Vec<TroutId>, Error> {
        self.0
            .prepare(
                r#"
                SELECT self_chain, self_id
                  FROM tokens
                  JOIN analysis
                    ON analysis.token = tokens.id
                 WHERE coi = -1
                "#,
            )?
            .query_map([], |row| {
                Ok(TroutId {
                    chain_id: row.get(0)?,
                    token_id: row.get(1)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()
            .map_err(Into::into)
    }

    pub fn outdated_token_ids(&self, chain_id: ChainId) -> Result<Vec<TokenId>, Error> {
        self.0
            .prepare(
                r#"
                SELECT tokens.self_id
                  FROM tokens
                  LEFT JOIN metadata ON metadata.token = tokens.id
                 WHERE tokens.self_chain = ?
                   AND (metadata.version IS NULL OR metadata.version < ?)
                "#,
            )?
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

    pub fn list_tokens_for_ui(
        &self,
        chain_id: impl Into<Option<ChainId>>,
    ) -> Result<Vec<TokenForUi>, Error> {
        self.0
            .prepare(
                r#"
                SELECT tokens.self_id,
                       tokens.owner,
                       analysis.coi,
                       metadata.left_parent_chain,
                       metadata.left_parent_id,
                       metadata.right_parent_chain,
                       metadata.right_parent_id,
                       metadata.name,
                       metadata.fee,
                       metadata.version IS NULL as pending
                  FROM tokens
                  LEFT JOIN metadata ON metadata.token = tokens.id
                  JOIN analysis ON analysis.token = tokens.id
                 WHERE iif(?1, tokens.self_chain = ?1, 1)
                 ORDER BY tokens.self_id ASC
                "#,
            )?
            .query_map([chain_id.into()], |row| {
                macro_rules! get_parent {
                    ($side:literal) => {
                        row.get::<_, Option<ChainId>>(concat!($side, "_parent_chain"))?
                            .map(|chain_id| {
                                let token_id =
                                    row.get::<_, TokenId>(concat!($side, "_parent_id"))?;
                                Ok::<_, rusqlite::Error>(TroutId { chain_id, token_id })
                            })
                            .transpose()?
                    };
                }
                let left_parent = get_parent!("left");
                let right_parent = get_parent!("right");
                Ok(TokenForUi {
                    id: row.get("self_id")?,
                    coi: row.get("coi")?,
                    owner: row.get::<_, String>("owner")?.parse().unwrap(),
                    name: row.get("name")?,
                    fee: row
                        .get::<_, Option<String>>("fee")?
                        .map(|f| f.parse().unwrap()),
                    parents: left_parent.zip(right_parent),
                    pending: row.get("pending")?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()
            .map_err(Into::into)
    }

    pub fn insert_tokens(&self, tokens: impl Iterator<Item = &TroutToken>) -> Result<(), Error> {
        let mut token_inserter = self.0.prepare_cached(
            r#"INSERT OR IGNORE INTO tokens (self_chain, self_id, owner) VALUES (?, ?, ?)"#,
        )?;
        let mut select_token_rowid = self
            .0
            .prepare_cached(r#"SELECT id FROM tokens WHERE self_chain = ? AND self_id = ?"#)?;
        let mut metadata_inserter = self.0.prepare_cached(
            r#"
            INSERT INTO metadata (
                token,
                version, name,
                fee,
                is_genesis, is_santa,
                left_parent_chain, left_parent_id,
                right_parent_chain, right_parent_id
            ) VALUES (
                ?,
                ?, ?,
                ?,
                ?, ?,
                ?, ?,
                ?, ?
            )
            "#,
        )?;
        let mut analysis_inserter = self
            .0
            .prepare_cached(r#"INSERT INTO analysis (token, coi) VALUES (?, ?)"#)?;
        let mut generation_inserter = self.0.prepare_cached(
            r#"INSERT OR IGNORE INTO generations (token, ord, cid) VALUES (?, ?, ?)"#,
        )?;
        for token in tokens {
            debug_assert!(!token.meta.name.is_empty());
            let props = &token.meta.properties;
            token_inserter.execute((
                props.self_id.chain_id,
                props.self_id.token_id,
                addr_to_hex(&token.owner),
            ))?;
            let token_rowid: i64 = select_token_rowid
                .query_row([props.self_id.chain_id, props.self_id.token_id], |row| {
                    row.get(0)
                })?;
            metadata_inserter.insert((
                token_rowid,
                props.version,
                &token.meta.name,
                token.fee.as_ref().map(u256_to_hex),
                props.attributes.genesis,
                props.attributes.santa,
                props.left.map(|token_id| token_id.chain_id),
                props.left.map(|token_id| token_id.token_id),
                props.right.map(|token_id| token_id.chain_id),
                props.right.map(|token_id| token_id.token_id),
            ))?;
            analysis_inserter.insert((token_rowid, token.coi))?;
            generation_inserter.execute((token_rowid, props.generations.len(), &*token.cid))?;
            for (ord, generation) in props.generations.iter().enumerate() {
                debug_assert!(!generation.is_empty());
                generation_inserter.execute((token_rowid, ord, &**generation))?;
            }
        }
        Ok(())
    }

    pub fn insert_pending_tokens(
        &self,
        chain_id: ChainId,
        pending_tokens: impl Iterator<Item = (TokenId, PendingToken)>,
    ) -> Result<(), Error> {
        let mut token_inserter = self.0.prepare_cached(
            r#"INSERT OR IGNORE INTO tokens (self_chain, self_id, owner) VALUES (?, ?, ?)"#,
        )?;
        for (token_id, token) in pending_tokens {
            token_inserter.execute((chain_id, token_id, addr_to_hex(&token.owner)))?;
        }
        Ok(())
    }

    pub fn set_token_name(&self, id: TroutId, name: &str) -> Result<(), Error> {
        self.0.execute(
            r#"
            UPDATE metadata
               SET name = ?
             WHERE token IN (SELECT id FROM tokens WHERE self_chain = ? AND self_id = ?)
            "#,
            (name, id.chain_id, id.token_id),
        )?;
        Ok(())
    }

    pub fn set_cois(&self, cois: impl Iterator<Item = (TroutId, f64)>) -> Result<(), Error> {
        let mut updater = self.0.prepare_cached(
            r#"
            UPDATE analysis
               SET coi = ?
             WHERE token IN (SELECT id FROM tokens WHERE self_chain = ? AND self_id = ?)
            "#,
        )?;
        for (trout_id, coi) in cois {
            updater.execute((coi, trout_id.chain_id, trout_id.token_id))?;
        }
        Ok(())
    }

    pub fn update_fees(
        &self,
        chain_id: ChainId,
        tokens: impl Iterator<Item = (TokenId, Option<U256>)>,
    ) -> Result<(), Error> {
        let mut fee_updater = self.0.prepare_cached(
            r#"
                UPDATE metadata
                   SET fee = ?
                 WHERE token IN (SELECT id FROM tokens WHERE self_chain = ? AND self_id = ?)
                "#,
        )?;
        for (token_id, fee) in tokens {
            fee_updater.execute((fee.as_ref().map(u256_to_hex), chain_id, token_id))?;
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

fn u256_to_hex(big: &U256) -> String {
    format!("{big:#x}")
}

fn addr_to_hex(addr: &Address) -> String {
    format!("{addr:#x}")
}

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("database driver error: {0}")]
    Driver(#[from] rusqlite::Error),
}
