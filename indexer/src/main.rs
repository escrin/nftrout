#![forbid(unsafe_code)]
#![feature(
    anonymous_lifetime_in_impl_trait,
    entry_insert,
    iter_partition_in_place
)]

mod api;
mod conf;
mod db;
mod indexer;
mod ipfs;
mod nftrout;
mod utils;

use tracing::info;

#[tokio::main]
async fn main() {
    let subscriber = tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .with_target(true);
    if cfg!(not(debug_assertions)) {
        subscriber.json().with_ansi(false).init();
    } else {
        subscriber.without_time().init();
    }

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

    let db = db::Db::open(cfg.db_path).unwrap();
    let ipfs = ipfs::Client::new(cfg.ipfs_endpoint);
    let nftrout = match cfg.chain {
        conf::Chain::SapphireMainnet => nftrout::Client::sapphire_mainnet(),
        conf::Chain::SapphireTestnet => nftrout::Client::sapphire_testnet(),
        conf::Chain::Local => nftrout::Client::local(),
    };

    let indexer_db = db.clone();
    let indexer_ipfs = ipfs.clone();
    let indexer_nftrout = nftrout.clone();
    let indexer_task = indexer::run(&indexer_nftrout, &indexer_ipfs, &indexer_db);

    let api_task = api::serve(db, ipfs, nftrout, cfg.api_port);

    tokio::join!(indexer_task, api_task);
}
