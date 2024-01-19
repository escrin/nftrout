use std::sync::Arc;

use ethers::types::{Address, U256};
use rusqlite::OptionalExtension as _;
use tracing::{debug, trace};

use crate::{
    ipfs::Cid,
    nftrout::{
        ChainId, Event, EventForUi, EventKindForUi, PendingToken, TokenEvent, TokenEventKind,
        TokenForUi, TokenId, TroutId, TroutToken,
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
        &[
            include_str!("./migrations/00-init.sql"),
            include_str!("./migrations/01-events.sql"),
        ]
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

    pub fn latest_processed_block(&self, chain_id: ChainId) -> Result<u64, Error> {
        self.0
            .query_row(
                "SELECT block FROM progress WHERE chain = ?",
                [chain_id],
                |row| Ok(row.get::<_, i64>(0)? as u64),
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
            .prepare("SELECT cid FROM generations WHERE pinned = 0 AND pin_fails < 20")?
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

    pub fn token_events(&self, token: TroutId) -> Result<Vec<EventForUi>, Error> {
        let mut breeding_query = self.0.prepare_cached(
            r#"
            WITH
            se AS (
                SELECT spawn_events.recipient,
                       metadata.token AS child_token,
                       metadata.left_parent_chain AS coparent_chain,
                       metadata.left_parent_id AS coparent_id,
                       events.block
                  FROM metadata
                  JOIN events ON events.token = metadata.token AND events.kind = 1
                  JOIN spawn_events ON spawn_events.event = events.id
                 WHERE metadata.right_parent_chain = ?1 AND metadata.right_parent_id = ?2
                 UNION ALL
                SELECT spawn_events.recipient,
                       metadata.token AS child_token,
                       metadata.right_parent_chain AS coparent_chain,
                       metadata.right_parent_id AS coparent_id,
                       events.block
                  FROM metadata
                  JOIN events ON events.token = metadata.token AND events.kind = 1
                  JOIN spawn_events ON spawn_events.event = events.id
                 WHERE metadata.left_parent_chain = ?1 AND metadata.left_parent_id = ?2
            ),
            le AS (
                SELECT list_events.fee, events.block
                FROM list_events
                JOIN events ON events.id = list_events.event
                WHERE events.token IN (SELECT id FROM tokens WHERE self_chain = ?1 AND self_id = ?2)
            ),
            te AS (
                SELECT transfer_events.recipient, events.block
                 FROM transfer_events
                 JOIN events ON events.id = transfer_events.event
                WHERE events.token IN (SELECT id FROM tokens WHERE self_chain = ?1 AND self_id = ?2)
            )
            SELECT
                tokens.self_chain AS child_chain,
                tokens.self_id AS child_id,
                se.recipient AS breeder,
                se.coparent_chain,
                se.coparent_id,
                COALESCE(
                    (
                        SELECT recipient
                        FROM te
                        WHERE block < se.block
                        ORDER BY block DESC
                        LIMIT 1
                    ),
                    (
                        SELECT recipient
                        FROM spawn_events
                        JOIN events ON spawn_events.event = events.id
                        WHERE events.token IN (
                                SELECT id FROM tokens WHERE self_chain = ?1 AND self_id = ?2
                              )
                    )
                ) AS owner,
                IIF(
                    lower(se.recipient) = lower(owner),
                    '0x00',
                    (
                        SELECT fee
                        FROM le
                        WHERE block < se.block
                        ORDER BY block DESC
                        LIMIT 1
                    )
                ) AS fee,
                se.block
            FROM se
            JOIN tokens ON tokens.id = se.child_token;
            "#,
        )?;
        let breeding_events = breeding_query
            .query_map((token.chain_id, token.token_id), |row| {
                Ok(EventForUi {
                    id: token,
                    block: row.get::<_, i64>("block")? as u64,
                    kind: EventKindForUi::Breed {
                        breeder: row
                            .get::<_, String>("breeder")
                            .map(|a| a.parse().unwrap())?,
                        child: TroutId {
                            chain_id: row.get("child_chain")?,
                            token_id: row.get("child_id")?,
                        },
                        coparent: TroutId {
                            chain_id: row.get("coparent_chain")?,
                            token_id: row.get("coparent_id")?,
                        },
                        price: row
                            .get::<_, Option<String>>("fee")?
                            .map(|f| f.parse().unwrap())
                            .unwrap_or_default(),
                        owner: row.get::<_, String>("owner").map(|a| a.parse().unwrap())?,
                    },
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(breeding_events)
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
            r#"
            INSERT INTO tokens (self_chain, self_id, owner)
            VALUES (?, ?, ?)
            ON CONFLICT (self_chain, self_id) DO NOTHING"#,
        )?;
        for (token_id, token) in pending_tokens {
            token_inserter
                .insert((chain_id, token_id, addr_to_hex(token.owner)))
                .optional()?;
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
        tokens: impl Iterator<Item = (TokenId, Option<&U256>)>,
    ) -> Result<(), Error> {
        let mut fee_updater = self.0.prepare_cached(
            r#"
                UPDATE metadata
                   SET fee = ?
                 WHERE token IN (SELECT id FROM tokens WHERE self_chain = ? AND self_id = ?)
                "#,
        )?;
        for (token_id, fee) in tokens {
            fee_updater.execute((fee.map(u256_to_hex), chain_id, token_id))?;
        }
        Ok(())
    }

    pub fn update_owners(
        &self,
        chain: ChainId,
        token_owners: impl Iterator<Item = (TokenId, &Address)>,
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

    pub fn record_events(
        &self,
        chain: ChainId,
        events: impl Iterator<Item = &Event>,
    ) -> Result<(), Error> {
        let conn = &self.0 .0;
        let mut event_inserter = conn.prepare_cached(
            r#"
            INSERT OR IGNORE INTO events (kind, token, block, log_index)
            VALUES (?, ?, ?, ?)
            RETURNING id
            "#,
        )?;
        let mut list_event_inserter =
            conn.prepare_cached(r#"INSERT INTO list_events (event, fee) VALUES (?, ?)"#)?;
        let mut spawn_event_inserter =
            conn.prepare_cached(r#"INSERT INTO spawn_events (event, recipient) VALUES (?, ?)"#)?;
        let mut transfer_event_inserter = conn.prepare_cached(
            r#"INSERT INTO transfer_events (event, sender, recipient) VALUES (?, ?, ?)"#,
        )?;
        let mut progress_updater =
            conn.prepare_cached(r#"UPDATE progress SET block = ? WHERE chain = ?"#)?;

        let mut last_block = None;
        for event in events {
            trace!(event = ?event, "processing event");
            match event {
                Event::Token(TokenEvent {
                    token,
                    kind,
                    block,
                    log_index,
                }) => {
                    let rowid = event_inserter
                        .query_row(
                            (
                                match kind {
                                    TokenEventKind::Spawned { .. } => 1,
                                    TokenEventKind::Relisted { .. } => 2,
                                    TokenEventKind::Transfer { .. } => 3,
                                },
                                token,
                                block,
                                log_index,
                            ),
                            |row| row.get::<_, i64>(0),
                        )
                        .optional()?;
                    let event_id = match rowid {
                        Some(id) => id,
                        None => continue,
                    };
                    match kind {
                        TokenEventKind::Spawned { to } => {
                            spawn_event_inserter.insert((event_id, addr_to_hex(to)))?;
                        }
                        TokenEventKind::Relisted { fee } => {
                            list_event_inserter
                                .insert((event_id, fee.as_ref().map(u256_to_hex)))?;
                        }
                        TokenEventKind::Transfer { from, to } => {
                            transfer_event_inserter.insert((
                                event_id,
                                addr_to_hex(from),
                                addr_to_hex(to),
                            ))?;
                        }
                    }
                }
                Event::ProcessedBlock(block) => {
                    last_block = Some(block);
                }
            }
        }
        if let Some(block) = last_block {
            trace!(block = block, "processed block");
            progress_updater.execute((last_block, chain))?;
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
