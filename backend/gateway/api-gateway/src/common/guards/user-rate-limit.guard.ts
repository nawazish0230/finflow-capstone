import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from './jwt-auth.guard';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

@Injectable()
export class UserRateLimitGuard implements CanActivate {
  private readonly store: RateLimitStore = {};
  private readonly ttl: number;
  private readonly maxRequests: number;
  private readonly authMaxRequests: number;

  constructor(private readonly configService: ConfigService) {
    this.ttl = this.configService.get<number>('rateLimit.ttl') ?? 60000;
    this.maxRequests =
      this.configService.get<number>('rateLimit.maxRequests') ?? 100;
    this.authMaxRequests =
      this.configService.get<number>('rateLimit.authMaxRequests') ?? 50;

    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as Request & { user?: JwtPayload }).user;

    if (!user || !user.sub) {
      // No user info, skip rate limiting (will be handled by auth guard)
      return true;
    }

    const userId = user.sub;
    const isAuthEndpoint = request.url.startsWith('/api/auth');
    const limit = isAuthEndpoint ? this.authMaxRequests : this.maxRequests;

    const key = `user:${userId}:${isAuthEndpoint ? 'auth' : 'api'}`;
    const now = Date.now();
    const entry = this.store[key];

    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired one
      this.store[key] = {
        count: 1,
        resetTime: now + this.ttl,
      };
      return true;
    }

    if (entry.count >= limit) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Rate limit exceeded. Maximum ${limit} requests per minute.`,
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    entry.count++;
    return true;
  }

  private cleanup(): void {
    const now = Date.now();
    Object.keys(this.store).forEach((key) => {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });
  }
}
