# Analytics Service

Finflow analytics microservice. Own database (`finflow_analytics`). Category spending and monthly trends.

## Endpoints

All analytics and transaction endpoints require `Authorization: Bearer <token>`.

### Analytics

- `GET /analytics/summary` – Total debit, total credit, transaction count
- `GET /analytics/categories` – Category breakdown (spending by category)
- `GET /analytics/monthly` – Monthly trends

### Transactions

- `GET /transactions` – Paginated list. Query params: `search`, `category`, `type`, `startDate`, `endDate`, `page`, `pageSize`

### Internal

- `POST /internal/sync/transactions` – Sync transactions from upload-service (optional `X-Internal-Api-Key` if `INTERNAL_API_KEY` is set)
- `GET /health` – Health check

## Environment

See `.env.example`. Use same `JWT_SECRET` as auth-service. `MONGODB_URI` should point to a **separate** database (e.g. `finflow_analytics`).

## Run

```bash
npm install
npm run start:dev
```

Default port: 3002.
 