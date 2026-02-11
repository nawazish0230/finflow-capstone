# FinFlow API – Postman Routes

**Base URL:** `http://localhost:3000` (or your `PORT` from `.env`)

---

## 1. No auth (public)

| Method | URL                                | Description                                                                                       |
| ------ | ---------------------------------- | ------------------------------------------------------------------------------------------------- |
| `GET`  | `http://localhost:3000/health`     | Health check (MongoDB ping). No body.                                                             |
| `POST` | `http://localhost:3000/auth/login` | Get JWT. **Body (JSON):** `{ "userId": "user-1", "email": "user@example.com" }` (email optional). |

---

## 2. Auth required (add header)

For all routes below, add header:

- **Key:** `Authorization`
- **Value:** `Bearer <your_token>`

Get `<your_token>` from the `accessToken` field of `POST /auth/login` response.

---

## 3. Auth

| Method | URL                                | Auth | Body / Params                                                          |
| ------ | ---------------------------------- | ---- | ---------------------------------------------------------------------- |
| `POST` | `http://localhost:3000/auth/login` | No   | **Body (JSON):** `{ "userId": "user-1", "email": "user@example.com" }` |

---

## 4. Upload

| Method | URL                                       | Auth | Body / Params                                                                       |
| ------ | ----------------------------------------- | ---- | ----------------------------------------------------------------------------------- |
| `POST` | `http://localhost:3000/upload/initiate`  | Yes  | **Body (form-data):** key `file`, type File, select a PDF. Single step: upload + process. |
| `GET`  | `http://localhost:3000/upload/status/:documentId` | Yes  | **Params:** `documentId` (from initiate response).                                  |
| `GET`  | `http://localhost:3000/upload/documents` | Yes  | No body.                                                                            |

---

## 5. Transactions

| Method | URL                                          | Auth | Body / Params                                                                                                                                   |
| ------ | -------------------------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `http://localhost:3000/transactions/summary` | Yes  | No body.                                                                                                                                        |
| `GET`  | `http://localhost:3000/transactions`         | Yes  | **Query (optional):** `page`, `limit`, `search`, `category`, `type`, `dateFrom`, `dateTo`. Example: `?page=1&limit=20&category=Food&type=debit` |

**Query params for list:**

- `page` – number (default 1)
- `limit` – number (default 20, max 100)
- `search` – string (description/merchant)
- `category` – one of: Food, Travel, Shopping, Bills, Entertainment, Others
- `type` – `debit` or `credit`
- `dateFrom` – ISO date string (e.g. `2025-01-01`)
- `dateTo` – ISO date string (e.g. `2025-12-31`)

---

## 6. Analytics

| Method | URL                                              | Auth | Body / Params |
| ------ | ------------------------------------------------ | ---- | ------------- |
| `GET`  | `http://localhost:3000/analytics/categories`     | Yes  | No body.      |
| `GET`  | `http://localhost:3000/analytics/monthly-trends` | Yes  | No body.      |

---

**Example messages:**

- `Where am I spending most of my money?`
- `Why was my spending high last month?`
- `Summarize my expenses in simple words`
- `Suggest areas where I can save money`

---

## Quick test order in Postman

1. **GET** `http://localhost:3000/health` – expect 200.
2. **POST** `http://localhost:3000/auth/login` with body `{ "userId": "test-user", "email": "test@example.com" }` – copy `accessToken`.
3. In **Authorization** tab (or in a collection): Type = Bearer Token, Token = `<accessToken>`.
4. **GET** `http://localhost:3000/transactions/summary` – expect 200 (may be empty data).
5. **GET** `http://localhost:3000/analytics/categories` – expect 200.

---

## Summary table (copy-paste)

```
GET  /health
POST /auth/login                    Body: { "userId": "...", "email": "..." }

GET  /upload/documents
POST /upload/initiate               Form-data: file = <PDF> (single step: upload + process)
GET  /upload/status/:documentId

GET  /transactions/summary
GET  /transactions                  Query: page, limit, search, category, type, dateFrom, dateTo

GET  /analytics/categories
GET  /analytics/monthly-trends

```
