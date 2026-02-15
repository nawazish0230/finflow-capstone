# API Gateway

Finflow API Gateway - Central entry point for all API requests with JWT validation, rate limiting, and request routing.

## Features

- ✅ **Request Routing**: Routes requests to appropriate microservices
- ✅ **JWT Validation**: Validates JWT tokens before proxying requests
- ✅ **Rate Limiting**: Per-user rate limiting (100 req/min for API, 50 req/min for auth)
- ✅ **User-based Rate Limiting**: Extracts user ID from JWT for rate limiting
- ✅ **Request Proxying**: Forwards requests to backend services with proper headers

## Routes

- `/api/auth/*` → Auth Service (Port 3001)
- `/api/upload/*` → Upload Service (Port 3002)
- `/api/analytics/*` → Analytics Service (Port 3003)
- `/api/chatbot/*` → Chatbot Service (Port 3004)

## Health Checks

### Aggregate Health Check
- `GET /health` - Checks all services and returns aggregate status
  - Returns: `healthy` if all services are up, `degraded` if any service is down
  - Includes response times and service details

### Gateway Health
- `GET /health/gateway` - Gateway service health only

### Individual Service Health (via Gateway)
- `GET /api/auth/health` - Auth service health (proxied)
- `GET /api/upload/health` - Upload service health (proxied)
- `GET /api/analytics/health` - Analytics service health (proxied)
- `GET /api/chatbot/health` - Chatbot service health (proxied)

**Note:** All health endpoints are public (no authentication required) and bypass rate limiting.

## Setup

1. Navigate to the api-gateway directory:
```bash
cd backend/gateway/api-gateway
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment file:
```bash
cp .env.example .env.local
```

4. Update `.env.local` with your configuration:
```env
JWT_SECRET=your-jwt-secret-must-match-auth-service
AUTH_SERVICE_URL=http://localhost:3001
UPLOAD_SERVICE_URL=http://localhost:3002
ANALYTICS_SERVICE_URL=http://localhost:3003
CHATBOT_SERVICE_URL=http://localhost:3004
```

5. Start the gateway:
```bash
npm run start:dev
```

The gateway will start on port 3000.

## Rate Limiting

### Configuration

- **Default Rate Limit**: 100 requests per minute per authenticated user
- **Auth Endpoints Rate Limit**: 50 requests per minute per authenticated user
- **TTL**: 60 seconds (1 minute)

### How It Works

1. Gateway extracts user ID from JWT token (`sub` claim)
2. Rate limiting is applied per user ID
3. Auth endpoints (`/api/auth/*`) have stricter limits (50 req/min)
4. Other endpoints have standard limits (100 req/min)

### Rate Limit Response

When rate limit is exceeded:
```json
{
  "statusCode": 429,
  "message": "Rate limit exceeded. Maximum 100 requests per minute.",
  "retryAfter": 45
}
```

## Authentication

### Public Endpoints

- `/api/auth/*` - Public endpoints (no authentication required)

### Protected Endpoints

- `/api/upload/*` - Requires valid JWT token
- `/api/analytics/*` - Requires valid JWT token
- `/api/chatbot/*` - Requires valid JWT token

### JWT Token Format

```
Authorization: Bearer <token>
```

The gateway validates the JWT token and extracts user information (`sub`, `email`) for rate limiting.

## Request Flow

```
Client Request
    ↓
API Gateway (Port 3000)
    ↓
JWT Validation (if not public)
    ↓
Rate Limiting (per user)
    ↓
Proxy to Backend Service
    ↓
Backend Service Response
    ↓
Client Response
```

## Headers Forwarded

The gateway forwards the following headers to backend services:

- `Authorization` - JWT token
- `Content-Type` - Request content type
- `x-correlation-id` - Request correlation ID (if present)
- `User-Agent` - Client user agent

## Error Handling

### 401 Unauthorized
- No token provided
- Invalid or expired token

### 429 Too Many Requests
- Rate limit exceeded

### 502 Bad Gateway
- Backend service unavailable
- Proxy request failed

## Development

From the `backend/gateway/api-gateway` directory:

```bash
# Development mode with watch
npm run start:dev

# Production build
npm run build
npm run start:prod
```

## Testing

```bash
# Test auth endpoint (public)
curl http://localhost:3000/api/auth/v1/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password"}'

# Test protected endpoint
curl http://localhost:3000/api/upload/health \
  -H "Authorization: Bearer <token>"
```

## Architecture

```
src/
├── config/
│   └── configuration.ts       # Configuration loader
├── common/
│   ├── decorators/
│   │   ├── public.decorator.ts
│   │   └── current-user.decorator.ts
│   └── guards/
│       ├── jwt-auth.guard.ts      # JWT validation
│       ├── optional-jwt.guard.ts  # Optional JWT (for rate limiting)
│       └── user-rate-limit.guard.ts  # Rate limiting
├── core/
│   └── proxy/
│       ├── proxy.controller.ts    # Route handlers
│       ├── proxy.service.ts       # HTTP proxy logic
│       └── proxy.module.ts
├── app.module.ts
└── main.ts
```

## Notes

- The gateway must use the same `JWT_SECRET` as the auth-service
- Rate limiting is in-memory (not persistent across restarts)
- For production, consider using Redis for distributed rate limiting
- All backend services should be running before starting the gateway
