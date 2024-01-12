use std::net::{Ipv4Addr, SocketAddrV4};

use axum::{
    body::Body,
    extract::{Path, Query, State},
    http::{Method, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use tower_http::cors;

use crate::nftrout::{ChainId, EventForUi, TokenForUi, TokenId, TroutId};

#[derive(Clone)]
struct AppState {
    db: crate::db::Db,
    ipfs: crate::ipfs::Client,
    nftrout: crate::nftrout::Client,
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

pub async fn serve(
    db: crate::db::Db,
    ipfs: crate::ipfs::Client,
    nftrout: crate::nftrout::Client,
    port: u16,
) {
    let bind_addr = SocketAddrV4::new(Ipv4Addr::new(0, 0, 0, 0), port);
    let listener = tokio::net::TcpListener::bind(bind_addr).await.unwrap();
    axum::serve(listener, make_router(AppState { db, ipfs, nftrout }))
        .await
        .unwrap();
}

fn make_router(state: AppState) -> Router {
    Router::new()
        .route("/", get(root))
        .route("/trout/:chain/", get(list_chain_trout))
        .route("/trout/:chain/:id/image.svg", get(get_trout_image))
        .route("/trout/:chain/:id/events", get(get_trout_events))
        .route("/trout/:chain/:id/name", post(set_trout_name))
        .layer(tower_http::trace::TraceLayer::new_for_http())
        .layer(
            tower_http::compression::CompressionLayer::new()
                .br(true)
                .gzip(true),
        )
        .layer(
            cors::CorsLayer::new()
                .allow_methods([Method::GET, Method::POST])
                .allow_origin(cors::Any)
                .allow_headers([axum::http::header::CONTENT_TYPE]),
        )
        .with_state(state)
}

async fn root() -> StatusCode {
    StatusCode::NO_CONTENT
}

async fn get_trout_image(
    Path((chain_id, token_id)): Path<(ChainId, TokenId)>,
    State(AppState { db, ipfs, .. }): State<AppState>,
) -> Result<Result<Response, StatusCode>, Error> {
    let image_cid =
        match db.with_conn(|conn| conn.token_cid(&TroutId { chain_id, token_id }, None))? {
            Some(cid) => cid.join("image/trout.svg"),
            None => return Ok(Err(StatusCode::NOT_FOUND)),
        };

    let res = ipfs.cat(&image_cid).await?;
    Ok(Ok(Response::builder()
        .header(axum::http::header::CONTENT_TYPE, "image/svg+xml")
        .status(res.status().as_u16())
        .body(Body::from_stream(res.bytes_stream()))?))
}

async fn get_trout_events(
    Path((chain_id, token_id)): Path<(ChainId, TokenId)>,
    State(AppState { db, .. }): State<AppState>,
) -> Result<Json<TroutEventsResponse>, Error> {
    Ok(Json(TroutEventsResponse {
        result: db.with_conn(|conn| conn.token_events(TroutId { chain_id, token_id }))?,
    }))
}

async fn set_trout_name(
    Path((chain_id, token_id)): Path<(ChainId, TokenId)>,
    State(AppState { db, nftrout, .. }): State<AppState>,
    Json(SetTroutParams {
        name,
        sig: sig_bytes,
    }): Json<SetTroutParams>,
) -> Result<Result<StatusCode, StatusCode>, Error> {
    let current_owner = nftrout.owner(token_id).await?;
    let sig = sig_bytes.as_ref().try_into()?;
    if !crate::nftrout::names::NameRequest::new(token_id, name.clone()).verify(&sig, current_owner)
    {
        return Ok(Err(StatusCode::FORBIDDEN));
    }
    db.with_conn(|conn| conn.set_token_name(TroutId { chain_id, token_id }, &name))?;
    Ok(Ok(StatusCode::NO_CONTENT))
}

async fn list_chain_trout(
    Path(chain_id): Path<ChainId>,
    Query(_qp): Query<ListTroutQuery>,
    State(AppState { db, .. }): State<AppState>,
) -> Result<Json<ListTroutResponse>, Error> {
    Ok(Json(ListTroutResponse {
        result: db.with_conn(|conn| conn.list_tokens_for_ui(chain_id))?,
    }))
}

#[derive(Clone, Debug, serde::Deserialize)]
struct SetTroutParams {
    name: String,
    sig: ethers::types::Bytes,
}

#[derive(Clone, Copy, Debug, Default, serde::Deserialize)]
#[serde(default)]
struct ListTroutQuery {}

#[derive(Clone, Debug, Default, serde::Serialize)]
struct ListTroutResponse {
    result: Vec<TokenForUi>,
}

#[derive(Clone, Debug, Default, serde::Serialize)]
struct TroutEventsResponse {
    result: Vec<EventForUi>,
}
