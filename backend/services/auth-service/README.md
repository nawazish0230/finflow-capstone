# Auth Service

Finflow auth microservice. Handles user registration, login, and JWT issuance.

## Endpoints

- `POST /auth/register` – Register (email, password) → `{ accessToken }`
- `POST /auth/login` – Login (email, password) → `{ accessToken }`
- `GET /health` – Health check

## Environment

See `.env.example`. Use the same `JWT_SECRET` as upload-service (and any other service that validates the token). 

**Database:** This service uses **PostgreSQL 16**. Configure connection details via `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DATABASE` environment variables.

See `POSTGRES_16_SETUP.md` for PostgreSQL 16 setup instructions.

## Run

```bash
npm install
npm run start:dev
```

Default port: 3001.

### Implement the version control

1. Add `v1, v2`
2. add the query parameter by passing `version=v1, v2`
3. add v1 v2 controller
