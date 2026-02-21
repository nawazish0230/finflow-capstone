# Correlation ID - Practical Examples

## Example 1: Adding CorrelationId to Auth Service

### Step 1: Create CorrelationId Decorator

```typescript
// backend/services/auth-service/src/common/decorators/correlation-id.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CORRELATION_ID_HEADER } from '../constants';

export const CorrelationId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return (
      request.headers[CORRELATION_ID_HEADER] ??
      (request as Request & { id?: string }).id
    );
  },
);
```

### Step 2: Update Controller to Accept CorrelationId

```typescript
// backend/services/auth-service/src/modules/auth/auth.controller.ts
import { CorrelationId } from '../../common/decorators/correlation-id.decorator';

@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @CorrelationId() correlationId: string,
  ): Promise<TokenResult> {
    return this.authService.register(dto.email, dto.password, correlationId);
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @CorrelationId() correlationId: string,
  ): Promise<TokenResult> {
    if (dto.email && dto.password) {
      return this.authService.loginWithEmailPassword(
        dto.email,
        dto.password,
        correlationId,
      );
    }
    throw new BadRequestException('Provide either email and password or userId');
  }
}
```

### Step 3: Update Service to Log with CorrelationId

```typescript
// backend/services/auth-service/src/modules/auth/auth.service.ts
import { Logger } from '@nestjs/common';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  async register(
    email: string,
    password: string,
    correlationId: string,
  ): Promise<TokenResult> {
    this.logger.log({
      correlationId,
      action: 'register',
      email: email.toLowerCase().trim(),
    });

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (existing) {
      this.logger.warn({
        correlationId,
        action: 'register',
        email: normalizedEmail,
        reason: 'User already exists',
      });
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await this.userRepository.save({
      email: normalizedEmail,
      password: hashedPassword,
    });

    this.logger.log({
      correlationId,
      action: 'register',
      userId: user.id,
      email: normalizedEmail,
      status: 'success',
    });

    return this.signToken({
      sub: user.id,
      email: user.email,
    });
  }

  async loginWithEmailPassword(
    email: string,
    password: string,
    correlationId: string,
  ): Promise<TokenResult> {
    this.logger.log({
      correlationId,
      action: 'login',
      email: email.toLowerCase().trim(),
    });

    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
      select: ['id', 'email', 'password'],
    });

    if (!user || !user.password) {
      this.logger.warn({
        correlationId,
        action: 'login',
        email: normalizedEmail,
        reason: 'User not found',
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      this.logger.warn({
        correlationId,
        action: 'login',
        email: normalizedEmail,
        userId: user.id,
        reason: 'Invalid password',
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    this.logger.log({
      correlationId,
      action: 'login',
      userId: user.id,
      email: normalizedEmail,
      status: 'success',
    });

    return this.signToken({ sub: user.id, email: user.email });
  }
}
```

## Example 2: Adding LoggingInterceptor to Auth Service

### Step 1: Create LoggingInterceptor

```typescript
// backend/services/auth-service/src/common/interceptors/logging.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Logger } from '@nestjs/common';
import { Request } from 'express';
import { CORRELATION_ID_HEADER } from '../constants';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const correlationId =
      (request.headers[CORRELATION_ID_HEADER] as string) ?? uuidv4();
    request.headers[CORRELATION_ID_HEADER] = correlationId;
    (request as Request & { id: string }).id = correlationId;

    const { method, url, ip } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log({
            correlationId,
            method,
            url,
            ip,
            durationMs: Date.now() - start,
          });
        },
        error: (err) => {
          this.logger.error({
            correlationId,
            method,
            url,
            error: err?.message,
            durationMs: Date.now() - start,
          });
        },
      }),
    );
  }
}
```

### Step 2: Register in AppModule

```typescript
// backend/services/auth-service/src/app.module.ts
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

@Module({
  // ... existing imports
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor }, // Add this
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
```

## Example 3: Using CorrelationId in Service-to-Service Calls

### HTTP Client Service

```typescript
// backend/services/analytics-service/src/modules/upload-client/upload-client.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { CORRELATION_ID_HEADER } from '../../common/constants';

@Injectable()
export class UploadClientService {
  private readonly logger = new Logger(UploadClientService.name);

  constructor(private readonly httpService: HttpService) {}

  async fetchTransactions(
    userId: string,
    correlationId: string,
  ): Promise<Transaction[]> {
    this.logger.log({
      correlationId,
      action: 'fetchTransactions',
      userId,
      targetService: 'upload-service',
    });

    try {
      const response = await this.httpService.axiosRef.get(
        `/transactions?userId=${userId}`,
        {
          headers: {
            [CORRELATION_ID_HEADER]: correlationId, // Propagate correlationId
          },
        },
      );

      this.logger.log({
        correlationId,
        action: 'fetchTransactions',
        userId,
        status: 'success',
        count: response.data?.length || 0,
      });

      return response.data;
    } catch (error) {
      this.logger.error({
        correlationId,
        action: 'fetchTransactions',
        userId,
        error: error.message,
        status: 'failed',
      });
      throw error;
    }
  }
}
```

## Example 4: Using CorrelationId in Kafka Events

### Producer

```typescript
// backend/services/upload-service/src/core/kafka/kafka-producer.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import { CORRELATION_ID_HEADER } from '../../common/constants';

@Injectable()
export class KafkaProducerService {
  private readonly logger = new Logger(KafkaProducerService.name);

  async publishTransactionCreated(
    transaction: Transaction,
    request: Request,
  ): Promise<void> {
    const correlationId =
      (request.headers[CORRELATION_ID_HEADER] as string) ??
      (request as Request & { id?: string }).id;

    const event = {
      transactionId: transaction.id,
      userId: transaction.userId,
      amount: transaction.amount,
      category: transaction.category,
      correlationId, // Include in event payload
    };

    this.logger.log({
      correlationId,
      action: 'publishTransactionCreated',
      transactionId: transaction.id,
      topic: 'transactions.created',
    });

    await this.producer.send({
      topic: 'transactions.created',
      messages: [
        {
          key: transaction.id,
          value: JSON.stringify(event),
        },
      ],
    });
  }
}
```

### Consumer

```typescript
// backend/services/analytics-service/src/core/kafka/kafka-consumer.service.ts
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class KafkaConsumerService {
  private readonly logger = new Logger(KafkaConsumerService.name);

  async handleTransactionCreated(event: TransactionCreatedEvent): Promise<void> {
    const { correlationId, transactionId } = event;

    this.logger.log({
      correlationId, // Use from event
      action: 'handleTransactionCreated',
      transactionId,
      source: 'kafka',
    });

    try {
      await this.analyticsService.upsertTransactionFromEvent(event);

      this.logger.log({
        correlationId,
        action: 'handleTransactionCreated',
        transactionId,
        status: 'success',
      });
    } catch (error) {
      this.logger.error({
        correlationId,
        action: 'handleTransactionCreated',
        transactionId,
        error: error.message,
        status: 'failed',
      });
      throw error;
    }
  }
}
```

## Example 5: Complete Request Flow with Logs

### Request

```bash
curl -X POST http://localhost:3001/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "x-correlation-id: my-custom-id-123" \
  -d '{"email": "user@example.com", "password": "password123"}'
```

### Log Output

```json
// LoggingInterceptor
{
  "correlationId": "my-custom-id-123",
  "method": "POST",
  "url": "/v1/auth/login",
  "ip": "127.0.0.1",
  "durationMs": 245
}

// AuthService.loginWithEmailPassword
{
  "correlationId": "my-custom-id-123",
  "action": "login",
  "email": "user@example.com"
}

// AuthService.loginWithEmailPassword (success)
{
  "correlationId": "my-custom-id-123",
  "action": "login",
  "userId": "uuid-123",
  "email": "user@example.com",
  "status": "success"
}
```

### Error Log Output

```json
// AuthService.loginWithEmailPassword (invalid password)
{
  "correlationId": "my-custom-id-123",
  "action": "login",
  "email": "user@example.com",
  "userId": "uuid-123",
  "reason": "Invalid password"
}

// HttpExceptionFilter
{
  "correlationId": "my-custom-id-123",
  "status": 401,
  "path": "/v1/auth/login",
  "body": {
    "message": "Invalid email or password"
  }
}

// LoggingInterceptor (error)
{
  "correlationId": "my-custom-id-123",
  "method": "POST",
  "url": "/v1/auth/login",
  "error": "Invalid email or password",
  "durationMs": 120
}
```

## Example 6: Filtering Logs by CorrelationId

### Using grep

```bash
# Find all logs for a specific request
grep "my-custom-id-123" logs/*.log

# Find logs with context (3 lines before/after)
grep -C 3 "my-custom-id-123" logs/app.log

# Case-insensitive search
grep -i "my-custom-id-123" logs/*.log
```

### Using jq (JSON logs)

```bash
# Filter logs by correlationId
cat logs/app.log | jq 'select(.correlationId == "my-custom-id-123")'

# Filter and format
cat logs/app.log | jq -r 'select(.correlationId == "my-custom-id-123") | "\(.timestamp) [\(.level)] \(.message)"'

# Count logs per correlationId
cat logs/app.log | jq -r '.correlationId' | sort | uniq -c
```

### Using Elasticsearch/Kibana

```json
// Query
{
  "query": {
    "match": {
      "correlationId": "my-custom-id-123"
    }
  },
  "sort": [
    {
      "@timestamp": "asc"
    }
  ]
}
```

## Example 7: Testing with CorrelationId

### Unit Test

```typescript
describe('AuthService', () => {
  let service: AuthService;
  const correlationId = 'test-correlation-id';

  it('should log correlationId during registration', async () => {
    const loggerSpy = jest.spyOn(Logger.prototype, 'log');

    await service.register('test@example.com', 'password', correlationId);

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId,
        action: 'register',
      }),
    );
  });
});
```

### E2E Test

```typescript
describe('AuthController (e2e)', () => {
  it('should propagate correlationId', async () => {
    const correlationId = 'e2e-test-id';

    const response = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .set('x-correlation-id', correlationId)
      .send({
        email: 'test@example.com',
        password: 'password',
      });

    expect(response.body.correlationId).toBe(correlationId);
  });
});
```

## Summary

These examples show:

1. ✅ How to add correlationId decorator
2. ✅ How to update controllers to accept correlationId
3. ✅ How to log with correlationId in services
4. ✅ How to propagate correlationId in HTTP calls
5. ✅ How to include correlationId in Kafka events
6. ✅ How to filter logs by correlationId
7. ✅ How to test with correlationId

Follow these patterns to add correlationId tracking throughout your services!
