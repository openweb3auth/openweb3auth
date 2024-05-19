# Example web application

1. Configure environment variables in `.env` file

```bash

# need keycloak
VITE_AUTHORITY=http://localhost:8080/realms/wallet
VITE_CLIENT_ID=openweb3auth
VITE_REDIRECT_URI=http://localhost:5174/login/callback

# require api running (../api)
VITE_ANONCREDS_URL=http://localhost:3015/anoncreds
VITE_API_URL=http://localhost:3015

# leave like this
VITE_MEDIATOR_DID=did:web:mediator.kfs.es
```