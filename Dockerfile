# O Next embute as variáveis do bloco `env` do next.config.js no bundle durante
# a compilação — elas não são lidas em runtime. Por isso chegam como ARG, e não
# como variável de ambiente do container: definidas só na execução, o front
# subiria apontando para `undefined`.
FROM node:22-alpine AS build

WORKDIR /app

# O `.npmrc` traz `legacy-peer-deps=true`, necessário para o `npm ci` resolver
# as dependências do projeto.
COPY package*.json .npmrc ./
RUN npm ci

ARG URL_ENDPOINT
ARG WEBSOCKET_HOST
ARG AMBIENTE=production

ENV URL_ENDPOINT=$URL_ENDPOINT
ENV WEBSOCKET_HOST=$WEBSOCKET_HOST
ENV AMBIENTE=$AMBIENTE

COPY . .

# `next build` direto, sem o `env-cmd` dos scripts: o arquivo `.env.production`
# não é versionado, e aqui os valores já vêm pelos ARG acima.
RUN npx next build

# ---

FROM node:22-alpine AS producao

WORKDIR /app

RUN apk add --no-cache tzdata
ENV TZ=America/Sao_Paulo

# Com `output: 'standalone'` o build já resolve as dependências: a pasta
# `.next/standalone` traz um servidor Node e só os módulos alcançados pelo
# código. Não há `npm ci` aqui — é o que derruba a imagem de ~1.7GB para
# algumas centenas de MB.
COPY --from=build /app/.next/standalone ./
# O standalone não inclui os assets estáticos nem o `public`: o servidor espera
# encontrá-los nesses caminhos.
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

ENV NODE_ENV=production
# Sem isso o servidor escuta apenas em localhost e o proxy não o alcança.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
