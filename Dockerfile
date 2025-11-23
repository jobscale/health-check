FROM node:lts-bookworm-slim AS builder
SHELL ["bash", "-c"]
WORKDIR /home/node
USER node
COPY --chown=node:staff . .
RUN npm i
RUN npm test
RUN npm ci --omit=dev

FROM node:lts-bookworm-slim
SHELL ["bash", "-c"]
WORKDIR /home/node
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates curl \
  iproute2 dnsutils netcat-openbsd \
 && apt-get clean && rm -fr /var/lib/apt/lists/*

USER node
COPY --from=builder /home/node/node_modules node_modules
COPY --chown=node:staff package.json .
COPY --chown=node:staff app app
CMD ["npm", "start"]
