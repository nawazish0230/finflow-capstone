# Auth Service

Finflow auth microservice. Handles user registration, login, and JWT issuance.

## Endpoints

- `POST /auth/register` – Register (email, password) → `{ accessToken }`
- `POST /auth/login` – Login (email, password) → `{ accessToken }`
- `GET /health` – Health check

## Environment

See `.env.example`. Use the same `JWT_SECRET` as upload-service (and any other service that validates the token).

## Run

```bash
npm install
npm run start:dev
```

Default port: 3001.
