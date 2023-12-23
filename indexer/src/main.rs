#![forbid(unsafe_code)]

mod api;
mod conf;
mod db;
mod indexer;
mod ipfs;
mod nftrout;

use tracing::info;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let cfg = config::Config::builder().add_source(config::Environment::with_prefix("NFT"));
    let cfg: conf::Config = match std::env::args().nth(1) {
        Some(conf_file) => cfg.add_source(config::File::with_name(&conf_file)),
        None => cfg,
    }
    .build()
    .unwrap()
    .try_deserialize()
    .unwrap();

    info!(config = ?cfg, "loaded config");

    let _memdb = (cfg.db_path.starts_with("file::memory:?cache=shared"))
        .then(|| rusqlite::Connection::open(&cfg.db_path).unwrap());
    let db = db::Db::open(&cfg.db_path).unwrap();
    let ipfs = ipfs::Client::new(cfg.ipfs_endpoint);

    let indexer_db = db.clone();
    let indexer_ipfs = ipfs.clone();
    tokio::task::spawn(async move {
        let nftrout = match cfg.chain {
            conf::Chain::SapphireMainnet => nftrout::Client::sapphire_mainnet(),
            conf::Chain::SapphireTestnet => nftrout::Client::sapphire_testnet(),
            conf::Chain::Local => nftrout::Client::local(),
        };
        let _conn = rusqlite::Connection::open("").unwrap();
        loop {
            let timeout = match indexer::run(&nftrout, &indexer_ipfs, &indexer_db).await {
                Ok(()) => cfg.reindex_interval,
                Err(e) => {
                    tracing::error!("indexer task exited with error: {e}");
                    std::time::Duration::from_secs(30)
                }
            };
            tokio::time::sleep(timeout).await;
        }
    });

    api::serve(db, ipfs).await
}
