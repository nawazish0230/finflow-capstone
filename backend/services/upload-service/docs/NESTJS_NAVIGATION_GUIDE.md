# NestJS Navigation Guide – FinFlow

A short guide to how this project is structured and how requests become routes.

---

## 1. Entry point: `src/main.ts`

- **What it does:** Starts the Nest app and listens on a port (default `3000`).
- **Flow:** `NestFactory.create(AppModule)` → builds the app from the root module → `app.listen(PORT)`.

```ts
// main.ts
const app = await NestFactory.create(AppModule);
await app.listen(process.env.PORT ?? 3000);
```

- **Where to look:** When you change global prefix, CORS, or pipeline (e.g. ValidationPipe), it’s usually here or in `app.module.ts`.

---

## 2. Root module: `src/app.module.ts`

- **What it does:** Imports all feature and core modules and registers global filters, guards, and interceptors.
- **Flow:** Every request goes through the modules and providers listed here.

| Section            | Purpose                                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------------------- |
| `imports: [...]`   | Feature modules (Auth, Upload, Transactions, etc.) and Config, Database, Throttler.                            |
| `providers: [...]` | Global: `HttpExceptionFilter`, `LoggingInterceptor`, `TransformInterceptor`, `JwtAuthGuard`, `ThrottlerGuard`. |

- **Where to look:** To add a new feature, create a module and add it to `imports`. To add a global guard/filter/interceptor, add it to `providers` with `APP_GUARD` / `APP_FILTER` / `APP_INTERCEPTOR`.

---

## 3. How routes are built (Controller → Route)

Nest uses **controllers** to define routes. Each controller is bound to a **path prefix**; methods get **HTTP method + path**.

### Pattern

```
Final URL = (optional global prefix) + Controller path + Method path
```

In this project there is no global prefix, so:

| File (Controller)            | Decorator                     | Final route example                                          |
| ---------------------------- | ----------------------------- | ------------------------------------------------------------ |
| `auth.controller.ts`         | `@Controller('auth')`         | `POST /auth/login`                                           |
| `upload.controller.ts`       | `@Controller('upload')`       | `POST /upload/initiate`, `GET /upload/status/:documentId`    |
| `transactions.controller.ts` | `@Controller('transactions')` | `GET /transactions/summary`, `GET /transactions`             |
| `analytics.controller.ts`    | `@Controller('analytics')`    | `GET /analytics/categories`, `GET /analytics/monthly-trends` |
| `health.controller.ts`       | `@Controller('health')`       | `GET /health`                                                |

### How to find “which file handles this URL?”

1. Note the first path segment (e.g. `auth`, `upload`, `transactions`).
2. Open the matching module folder: `src/modules/<name>/`.
3. Open `<name>.controller.ts`.
4. Look at `@Controller('...')` for the prefix and `@Get()`, `@Post()`, etc. for the rest of the path.

### Example: “Where is `POST /upload/complete/:documentId`?”

1. Prefix = `upload` → go to `src/modules/upload/`.
2. Open `upload.controller.ts`.
3. Find `@Post('complete/:documentId')` → that method handles the route.

---

## 4. Project folder map

```
src/
├── main.ts                 # App bootstrap, port
├── app.module.ts           # Root module, global guards/filters/interceptors
├── app.controller.ts       # Optional root routes (e.g. /)
├── app.service.ts
│
├── config/                 # App configuration
│   ├── configuration.ts    # Defaults from env
│   └── env.validation.ts   # Env validation (optional)
│
├── core/                   # Shared infra
│   └── database/
│       └── database.module.ts   # MongoDB connection
│
├── common/                 # Shared across modules
│   ├── constants/         # Enums, pagination, etc.
│   ├── decorators/        # @CurrentUser(), @Public(), @CorrelationId()
│   ├── filters/           # HttpExceptionFilter (error shape)
│   ├── guards/            # JwtAuthGuard (protect routes)
│   └── interceptors/     # Logging, response transform
│
├── health/                 # Health check
│   ├── health.module.ts
│   └── health.controller.ts   # GET /health
│
└── modules/                # Feature modules (each ≈ one domain)
    ├── auth/
    │   ├── auth.module.ts
    │   ├── auth.controller.ts   # POST /auth/login
    │   ├── auth.service.ts
    │   ├── dto/                 # login.dto.ts
    │   └── strategies/          # jwt.strategy.ts
    │
    ├── upload/
    │   ├── upload.module.ts
    │   ├── upload.controller.ts # /upload/initiate, complete, status, documents
    │   ├── upload.service.ts
    │   └── schemas/             # document.schema.ts (Mongoose)
    │
    ├── transactions/
    │   ├── transactions.module.ts
    │   ├── transactions.controller.ts  # /transactions, /transactions/summary
    │   ├── transactions.service.ts
    │   ├── dto/
    │   └── schemas/             # transaction.schema.ts
    │
    ├── analytics/
        ├── analytics.module.ts
        ├── analytics.controller.ts  # /analytics/categories, monthly-trends
        └── analytics.service.ts

```

---

## 5. Request flow (high level)

1. **Request** hits Nest (e.g. `GET /transactions?page=1`).
2. **Guards** run (e.g. `JwtAuthGuard`). If route is not `@Public()`, JWT is checked.
3. **Controller** method runs (e.g. `TransactionsController.list()`).
4. **Service** is called (e.g. `TransactionsService.list()`).
5. **Interceptors** run (e.g. `TransformInterceptor` wraps response in `{ data, meta, timestamp }`).
6. **Response** is sent.

If an error is thrown, **HttpExceptionFilter** formats it (statusCode, message, correlationId).

---

## 6. Quick reference: “I want to…”

| Goal                               | Where to go                                                                                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Add a new API route                | Add method in the right `*.controller.ts` under `modules/<feature>/`.                                                                                  |
| Change auth (who can call)         | Use `@Public()` on the route or adjust `JwtAuthGuard` in `common/guards/`.                                                                             |
| Change response shape              | `common/interceptors/transform.interceptor.ts` or per-route in controller.                                                                             |
| Change error response shape        | `common/filters/http-exception.filter.ts`.                                                                                                             |
| Add/change DB model                | Add/change schema in `modules/<feature>/schemas/*.schema.ts`, then use in `*.service.ts`.                                                              |
| Add env variable                   | Use it in `config/configuration.ts` and optionally in `config/env.validation.ts`.                                                                      |
| Add a new feature (e.g. “reports”) | New folder `modules/reports/` with `reports.module.ts`, `reports.controller.ts`, `reports.service.ts`, then import `ReportsModule` in `app.module.ts`. |

---

## 7. Running and testing routes

```bash
# Start dev server (watch mode)
npm run start:dev

# Build
npm run build

# Start production
npm run start:prod
```

Base URL: `http://localhost:3000` (or the port in `.env`).

- **Health (no auth):** `GET http://localhost:3000/health`
- **Login (get JWT):** `POST http://localhost:3000/auth/login` with body `{ "userId": "user-1", "email": "a@b.com" }`
- **Protected routes:** Add header `Authorization: Bearer <token>`.

If you use a global prefix later (e.g. `app.setGlobalPrefix('api')` in `main.ts`), all routes become `/api/...` (e.g. `/api/health`, `/api/auth/login`).
