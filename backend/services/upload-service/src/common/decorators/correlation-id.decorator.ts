import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CORRELATION_ID_HEADER } from '../constants';

export const CorrelationId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string | undefined => {
  const request = ctx.switchToHttp().getRequest();
  return request.headers[CORRELATION_ID_HEADER] ?? request.id;
});
