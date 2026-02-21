import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtPayload } from './jwt-auth.guard';

/**
 * Optional JWT Guard - validates token if present but doesn't throw if missing
 * Used for endpoints that work both with and without authentication
 */
@Injectable()
export class OptionalJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      return true; // No token, continue without user info
    }

    try {
      const secret = this.configService.get<string>('jwt.secret');
      const payload = this.jwtService.verify<JwtPayload>(token, { secret });
      
      // Attach user info to request if token is valid
      (request as Request & { user?: JwtPayload }).user = payload;
    } catch (error) {
      // Invalid token, continue without user info
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] =
      request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
