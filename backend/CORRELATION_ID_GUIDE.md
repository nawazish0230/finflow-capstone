# Correlation ID Guide

## What is Correlation ID?

A **Correlation ID** (also called Request ID or Trace ID) is a unique identifier assigned to each HTTP request that flows through your microservices. It allows you to:

1. **Track requests** across multiple services
2. **Debug issues** by filtering logs by a single request
3. **Monitor performance** by following a request's journey
4. **Correlate logs** from different services for the same user action

## How It Works in FinFlow

### Current Implementation

#### 1. **Header Name**
All services use the header: `x-correlation-id`

#### 2. **Generation**
- If the client sends `x-correlation-id` header, it's used
- If not present, a new UUID v4 is generated automatically
- The ID is attached to the request object and passed through the entire request lifecycle

#### 3. **Services Status**

| Service | LoggingInterceptor | HttpExceptionFilter | CorrelationId Decorator |
|---------|-------------------|---------------------|------------------------|
| `upload-service` | ✅ Yes | ✅ Yes | ✅ Yes |
| `auth-service` | ❌ No | ✅ Yes | ❌ No |
| `analytics-service` | ❌ No | ✅ Yes | ❌ No |
| `chatbot-service` | ❌ No | ❌ No | ❌ No |

## How Correlation ID is Used

### 1. **Automatic Logging (Upload Service)**

The `LoggingInterceptor` in `upload-service` automatically logs every request with correlationId:

```typescript
// backend/services/upload-service/src/common/interceptors/logging.interceptor.ts
this.logger.log({
  correlationId,
  method,
  url,
  ip,
  durationMs: Date.now() - start,
});
```

**Example Log Output:**
```json
{
  "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "method": "POST",
  "url": "/upload",
  "ip": "127.0.0.1",
  "durationMs": 245
}
```

### 2. **Error Logging (All Services)**

The `HttpExceptionFilter` includes correlationId in error responses and logs:

```typescript
// backend/services/*/src/common/filters/http-exception.filter.ts
this.logger.warn({ correlationId, status, path: request.url, body });

response.status(status).json({
  ...body,
  statusCode: status,
  correlationId,  // Included in error response
  timestamp: new Date().toISOString(),
});
```

**Example Error Response:**
```json
{
  "statusCode": 400,
  "message": "Invalid file format",
  "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "timestamp": "2026-02-10T10:30:00.000Z"
}
```

### 3. **Using CorrelationId Decorator (Upload Service)**

You can inject correlationId directly into controller methods:

```typescript
import { CorrelationId } from '../common/decorators/correlation-id.decorator';

@Controller('upload')
export class UploadController {
  @Post()
  async uploadFile(
    @CorrelationId() correlationId: string,
    @Body() dto: UploadDto,
  ) {
    // Use correlationId in your logic
    this.logger.log(`Processing upload with correlationId: ${correlationId}`);
    return this.uploadService.process(dto);
  }
}
```

### 4. **Manual Logging in Services**

To track correlationId in your service methods, you need to:

#### Option A: Pass correlationId from Controller to Service

```typescript
// Controller
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  async getTransactions(@CorrelationId() correlationId: string) {
    return this.transactionsService.findAll(correlationId);
  }
}

// Service
@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  async findAll(correlationId: string) {
    this.logger.log({
      correlationId,
      message: 'Fetching all transactions',
    });
    
    // Your logic here
    const transactions = await this.transactionModel.find();
    
    this.logger.log({
      correlationId,
      message: 'Transactions fetched successfully',
      count: transactions.length,
    });
    
    return transactions;
  }
}
```

#### Option B: Extract from Request Object

```typescript
import { Request } from 'express';
import { CORRELATION_ID_HEADER } from '../common/constants';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  async findAll(request: Request) {
    const correlationId = 
      request.headers[CORRELATION_ID_HEADER] as string ?? 
      (request as Request & { id?: string }).id;
    
    this.logger.log({
      correlationId,
      message: 'Fetching transactions',
    });
    
    // Your logic
  }
}
```

#### Option C: Create a Request Context Service (Recommended)

Create a service that stores correlationId in AsyncLocalStorage:

```typescript
// src/common/services/request-context.service.ts
import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

interface RequestContext {
  correlationId: string;
  userId?: string;
}

@Injectable()
export class RequestContextService {
  private readonly asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

  run<T>(context: RequestContext, callback: () => T): T {
    return this.asyncLocalStorage.run(context, callback);
  }

  getCorrelationId(): string | undefined {
    return this.asyncLocalStorage.getStore()?.correlationId;
  }

  getUserId(): string | undefined {
    return this.asyncLocalStorage.getStore()?.userId;
  }
}
```

Then use it in an interceptor:

```typescript
// src/common/interceptors/request-context.interceptor.ts
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  constructor(private readonly requestContext: RequestContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const correlationId = 
      request.headers[CORRELATION_ID_HEADER] as string ?? 
      uuidv4();

    return this.requestContext.run({ correlationId }, () => {
      return next.handle();
    });
  }
}
```

Then in any service:

```typescript
@Injectable()
export class TransactionsService {
  constructor(private readonly requestContext: RequestContextService) {}
  
  async findAll() {
    const correlationId = this.requestContext.getCorrelationId();
    this.logger.log({ correlationId, message: 'Fetching transactions' });
  }
}
```

## Tracking Correlation ID in Logs

### 1. **Filter Logs by Correlation ID**

Using `grep` or log aggregation tools:

```bash
# Find all logs for a specific request
grep "a1b2c3d4-e5f6-7890-abcd-ef1234567890" logs/*.log

# Using jq (if logs are JSON)
cat logs/app.log | jq 'select(.correlationId == "a1b2c3d4-e5f6-7890-abcd-ef1234567890")'
```

### 2. **Structured Logging Format**

Always log correlationId as part of a structured object:

```typescript
// ✅ Good - Structured
this.logger.log({
  correlationId,
  action: 'processTransaction',
  userId: '123',
  transactionId: '456',
  duration: 150,
});

// ❌ Bad - String interpolation
this.logger.log(`Processing transaction ${transactionId} for user ${userId}`);
```

### 3. **Log Levels with Correlation ID**

```typescript
// Debug - Detailed information
this.logger.debug({
  correlationId,
  message: 'Starting transaction processing',
  input: { amount: 100, category: 'Food' },
});

// Info - General flow
this.logger.log({
  correlationId,
  message: 'Transaction processed successfully',
  transactionId: '123',
});

// Warn - Recoverable issues
this.logger.warn({
  correlationId,
  message: 'Retry attempt failed',
  attempt: 2,
  maxAttempts: 3,
});

// Error - Failures
this.logger.error({
  correlationId,
  message: 'Transaction processing failed',
  error: error.message,
  stack: error.stack,
});
```

## Propagating Correlation ID Across Services

### HTTP Client Calls

When making HTTP calls between services, include the correlationId header:

```typescript
import { CORRELATION_ID_HEADER } from '../common/constants';

@Injectable()
export class AnalyticsClientService {
  constructor(private readonly httpService: HttpService) {}

  async fetchData(correlationId: string) {
    return this.httpService.axiosRef.get('/analytics/summary', {
      headers: {
        [CORRELATION_ID_HEADER]: correlationId,  // Propagate correlationId
      },
    });
  }
}
```

### Kafka Events

Include correlationId in Kafka event payloads:

```typescript
// Producer
await this.kafkaProducer.publish('transactions.created', {
  transactionId: '123',
  userId: '456',
  correlationId: request.headers[CORRELATION_ID_HEADER],  // Include in event
  // ... other fields
});

// Consumer
async handleTransactionCreated(event: TransactionCreatedEvent) {
  const { correlationId, transactionId } = event;
  
  this.logger.log({
    correlationId,  // Use from event
    message: 'Processing transaction event',
    transactionId,
  });
}
```

## Best Practices

### ✅ Do

1. **Always include correlationId in logs**
   ```typescript
   this.logger.log({ correlationId, ...otherData });
   ```

2. **Pass correlationId through service calls**
   ```typescript
   await this.otherService.doSomething(correlationId, data);
   ```

3. **Include correlationId in error responses**
   ```typescript
   throw new HttpException({
     message: 'Error occurred',
     correlationId,
   }, 500);
   ```

4. **Use structured logging**
   ```typescript
   this.logger.log({ correlationId, key: value });
   ```

### ❌ Don't

1. **Don't generate new correlationId in services**
   ```typescript
   // ❌ Bad
   const correlationId = uuidv4();
   ```

2. **Don't log without correlationId**
   ```typescript
   // ❌ Bad
   this.logger.log('Processing transaction');
   ```

3. **Don't forget to propagate in HTTP calls**
   ```typescript
   // ❌ Bad
   await this.httpService.get('/api/data');  // Missing correlationId header
   ```

## Example: Complete Request Flow

### Request Flow with Correlation ID

```
1. Client Request
   POST /upload
   Headers: { "x-correlation-id": "abc-123" }  (optional)

2. LoggingInterceptor (upload-service)
   - Extracts or generates correlationId: "abc-123"
   - Logs: { correlationId: "abc-123", method: "POST", url: "/upload" }

3. UploadController
   @Post()
   async upload(@CorrelationId() correlationId: string) {
     // correlationId = "abc-123"
   }

4. UploadService
   async process(correlationId: string) {
     this.logger.log({ correlationId, message: "Processing file" });
     
     // Call Analytics Service
     await this.analyticsClient.sync(correlationId, data);
   }

5. AnalyticsClientService (HTTP call)
   async sync(correlationId: string, data) {
     await this.httpService.post('/analytics/sync', data, {
       headers: { "x-correlation-id": correlationId }  // Propagate
     });
   }

6. AnalyticsService (receives request)
   - LoggingInterceptor extracts correlationId: "abc-123"
   - Logs: { correlationId: "abc-123", method: "POST", url: "/analytics/sync" }

7. Kafka Producer
   await this.kafkaProducer.publish('transactions.created', {
     correlationId: "abc-123",  // Include in event
     // ... data
   });

8. Kafka Consumer (analytics-service)
   async handleEvent(event) {
     const { correlationId } = event;
     this.logger.log({ correlationId, message: "Processing event" });
   }

9. Error Response (if error occurs)
   {
     "statusCode": 500,
     "message": "Processing failed",
     "correlationId": "abc-123",  // Included in response
     "timestamp": "2026-02-10T10:30:00.000Z"
   }
```

## Logging Tools Integration

### ELK Stack (Elasticsearch, Logstash, Kibana)

```typescript
// Configure logger to output JSON
this.logger.log({
  '@timestamp': new Date().toISOString(),
  correlationId: 'abc-123',
  level: 'info',
  message: 'Transaction processed',
  service: 'upload-service',
});
```

### CloudWatch / Datadog

```typescript
this.logger.log({
  correlationId: 'abc-123',
  service: 'upload-service',
  environment: process.env.NODE_ENV,
  message: 'Transaction processed',
});
```

## Summary

- **Correlation ID** = Unique identifier for each request
- **Header**: `x-correlation-id`
- **Auto-generated** if not provided by client
- **Included in**: Logs, error responses, HTTP calls, Kafka events
- **Use it**: To track requests across services and debug issues
- **Best practice**: Always include in structured logs

## Next Steps

1. Add `LoggingInterceptor` to `auth-service` and `analytics-service`
2. Create `CorrelationId` decorator for all services
3. Update all service methods to accept and log correlationId
4. Configure log aggregation tool (ELK, CloudWatch, etc.) to index by correlationId
