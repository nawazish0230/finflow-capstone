import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Logger } from '@nestjs/common';
import { Request } from 'express';
import { CORRELATION_ID_HEADER } from '../constants';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const correlationId = (request.headers[CORRELATION_ID_HEADER] as string) ?? uuidv4();
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
