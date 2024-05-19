# Example API with OpenWeb3 Auth

To run this project you need to have [bun](https://bun.sh) installed.

To install dependencies:

```bash
bun install
```

To run:

```bash
npx tsx ./src/server.ts
```

To run keycloak:

```bash
docker run -p 8080:8080 -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin quay.io/keycloak/keycloak:24.0.4 start-dev
```

You'll need to create a realm and a client with the following settings:

- Realm: `wallet`
- Client: `openweb3auth`

Environment variables needed:

```bash
export SECRET_KEY=e3b8f2d19507910c7272dd462e154c6a54ced596112f57d3bf3437ca9ca6a9ef # generate with `openssl rand -hex 32`
export POSTGRES_URL=postgresql://postgres:postgres@127.0.0.1:5432/openweb3auth
export KEYCLOAK_URL=http://localhost:8080
export KEYCLOAK_REALM=wallet
```

To run the migrations:
```bash
bun db:migrate
```

To create a new migration:
```bash
bun db:generate:migration
```
