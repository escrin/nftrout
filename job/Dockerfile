FROM node:18 AS builder

ENV INPUTS_DIR=/inputs
ENV OUTPUTS_DIR=/outputs
ENV WEB3_GW_URL=https://testnet.sapphire.oasis.dev

WORKDIR /build

COPY package.json ./
RUN npm install

COPY ./src ./src
COPY ./tsconfig.json .

RUN npm run build

FROM node:18

COPY --from=builder /build/bin/nftrout /opt/nftrout/nftrout

ENTRYPOINT ["/usr/bin/env", "node", "/opt/nftrout/nftrout"]
