FROM node:18

ENV INPUTS_DIR=/inputs
ENV OUTPUTS_DIR=/outputs

WORKDIR /opt/nftrout

COPY package.json .
RUN npm install

COPY ./*.js .

ENTRYPOINT ["/usr/bin/env", "node", "/opt/nftrout/nftrout.js"]
