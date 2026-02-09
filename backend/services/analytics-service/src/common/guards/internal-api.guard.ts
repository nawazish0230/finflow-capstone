import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { INTERNAL_API_KEY_HEADER } from '../constants';

@Injectable()
export class InternalApiGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const apiKey = this.config.get<string>('internal.apiKey');
    if (!apiKey) return true;
    const request = context.switchToHttp().getRequest<Request>();
    const headerKey = request.headers[INTERNAL_API_KEY_HEADER];
    if (headerKey !== apiKey) {
      throw new UnauthorizedException('Invalid or missing internal API key');
    }
    return true;
  }
}
