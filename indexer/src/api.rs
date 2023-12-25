use std::net::{Ipv4Addr, SocketAddrV4};

use axum::{
    body::Body,
    extract::{Path, State},
    http::{Method, StatusCode},
    response::{IntoResponse, Response},
    routing::get,
    Router,
};
use tower_http::cors;

use crate::nftrout::TokenId;

#[derive(Clone)]
struct AppState {
    db: crate::db::Db,
    ipfs: crate::ipfs::Client,
}

#[derive(Debug)]
struct Error(anyhow::Error);

impl<T: Into<anyhow::Error>> From<T> for Error {
    fn from(e: T) -> Self {
        Self(e.into())
    }
}

impl IntoResponse for Error {
    fn into_response(self) -> Response {
        tracing::error!(error = ?self.0, "api error");
        StatusCode::INTERNAL_SERVER_ERROR.into_response()
    }
}

pub async fn serve(db: crate::db::Db, ipfs: crate::ipfs::Client, port: u16) {
    let bind_addr = SocketAddrV4::new(Ipv4Addr::new(0, 0, 0, 0), port);
    let listener = tokio::net::TcpListener::bind(bind_addr).await.unwrap();
    axum::serve(listener, make_router(AppState { db, ipfs }))
        .await
        .unwrap();
}

fn make_router(state: AppState) -> Router {
    Router::new()
        .route("/", get(root))
        // .route("/trout/:chain/:id/metadata.json", get(get_trout_meta))
        .route("/trout/:chain/:id/image.svg", get(get_trout_image))
        .layer(tower_http::trace::TraceLayer::new_for_http())
        .layer(
            cors::CorsLayer::new()
                .allow_methods([Method::GET, Method::POST])
                .allow_origin(cors::Any),
        )
        .with_state(state)
}

async fn root() -> StatusCode {
    StatusCode::NO_CONTENT
}

async fn get_trout_image(
    Path((chain_id, token_id)): Path<(u64, u64)>,
    State(AppState { db, ipfs }): State<AppState>,
) -> Result<Result<Response, StatusCode>, Error> {
    let image_cid =
        match db.with_conn(|conn| conn.token_image_cid(TokenId { chain_id, token_id }))? {
            Some(cid) => cid,
            None => return Ok(Err(StatusCode::NOT_FOUND)),
        };

    let res = ipfs.cat(&image_cid, Some("trout.svg")).await?;
    Ok(Ok(Response::builder()
        .header(axum::http::header::CONTENT_TYPE, "image/svg+xml")
        .status(res.status().as_u16())
        .body(Body::from_stream(res.bytes_stream()))?))
}
