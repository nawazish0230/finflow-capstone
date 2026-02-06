import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

export interface ApiResponse<T> {
  data: T;
  meta?: { page?: number; limit?: number; total?: number };
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const meta = (request as Request & { paginationMeta?: { page: number; limit: number; total: number } })
      .paginationMeta;

    return next.handle().pipe(
      map((data) => ({
        data,
        ...(meta && { meta: { page: meta.page, limit: meta.limit, total: meta.total } }),
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
