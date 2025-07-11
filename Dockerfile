FROM node:lts-bookworm-slim as builder
SHELL ["bash", "-c"]
WORKDIR /home/node
USER node
COPY --chown=node:staff package.json .
RUN npm i
COPY --chown=node:staff .eslintrc.js .
COPY --chown=node:staff app app
RUN npm test
RUN npm ci --omit=dev

FROM node:lts-bookworm-slim
SHELL ["bash", "-c"]
WORKDIR /home/node
USER node
COPY --from=builder /home/node/node_modules node_modules
COPY --chown=node:staff package.json .
COPY --chown=node:staff app app
CMD ["npm", "start"]
