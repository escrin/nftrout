FROM node:18 AS builder

ENV INPUTS_DIR=/inputs
ENV OUTPUTS_DIR=/outputs
ENV WEB3_GW_URL=https://testnet.sapphire.oasis.dev

WORKDIR /build

COPY package.json oasisprotocol-sapphire-paratime-*.tgz .
RUN npm install

COPY ./src ./src
COPY ./tsconfig.json .

RUN npm run build

FROM node:18

ARG ATTOK_ADDR
RUN if [ -z "$ATTOK_ADDR" ]; then exit 1; fi
ENV ATTOK_ADDR=$ATTOK_ADDR

ARG LOCKBOX_ADDR
RUN if [ -z "$LOCKBOX_ADDR" ]; then exit 1; fi
ENV LOCKBOX_ADDR=$LOCKBOX_ADDR

ARG WEB3_GW_URL
RUN if [ -z "$WEB3_GW_URL" ]; then exit 1; fi
ENV WEB3_GW_URL=$WEB3_GW_URL

COPY --from=builder /build/bin/nftrout /opt/nftrout/nftrout

ENTRYPOINT ["/usr/bin/env", "node", "/opt/nftrout/nftrout"]
