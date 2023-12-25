FROM rust:1-alpine AS builder

RUN apk add --no-cache musl-dev

WORKDIR /code

COPY rust-toolchain.toml .

RUN rustup show

COPY Cargo.* .

RUN mkdir -p src && touch src/lib.rs && \
    cargo metadata --locked --format-version=1 && \
    rm src/lib.rs

COPY ./ ./

RUN cargo build --release --target x86_64-unknown-linux-musl

FROM gcr.io/distroless/static-debian12:latest AS runner

COPY --from=builder /code/target/x86_64-unknown-linux-musl/release/nftrout-indexer .

ENTRYPOINT ["./nftrout-indexer"]
