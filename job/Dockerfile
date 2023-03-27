FROM node:18

ENV INPUTS_DIR=/inputs
ENV OUTPUTS_DIR=/outputs

COPY ./*.js /opt/nftrout/

ENTRYPOINT ["/usr/bin/env", "node", "/opt/nftrout/nftrout.js"]
