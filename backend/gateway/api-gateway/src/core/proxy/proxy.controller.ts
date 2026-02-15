import {
  Controller,
  All,
  Req,
  Res,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { OptionalJwtGuard } from '../../common/guards/optional-jwt.guard';
import { UserRateLimitGuard } from '../../common/guards/user-rate-limit.guard';
import { Public } from '../../common/decorators/public.decorator';

@Controller('api')
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  // Health check endpoints (public, no rate limiting) - must be before catch-all routes
  @All('auth/health')
  @Public()
  async proxyAuthHealth(@Req() request: Request, @Res() response: Response) {
    return this.proxy('auth', request, response);
  }

  @All('upload/health')
  @Public()
  async proxyUploadHealth(@Req() request: Request, @Res() response: Response) {
    return this.proxy('upload', request, response);
  }

  @All('analytics/health')
  @Public()
  async proxyAnalyticsHealth(
    @Req() request: Request,
    @Res() response: Response,
  ) {
    return this.proxy('analytics', request, response);
  }

  @All('chatbot/health')
  @Public()
  async proxyChatbotHealth(@Req() request: Request, @Res() response: Response) {
    return this.proxy('chatbot', request, response);
  }

  // Catch-all routes for service proxying
  @All('auth/*path')
  @Public() // Auth endpoints don't require authentication
  @UseGuards(OptionalJwtGuard, UserRateLimitGuard)
  async proxyAuth(@Req() request: Request, @Res() response: Response) {
    return this.proxy('auth', request, response);
  }

  @All('upload/*path')
  @UseGuards(OptionalJwtGuard, UserRateLimitGuard)
  async proxyUpload(@Req() request: Request, @Res() response: Response) {
    return this.proxy('upload', request, response);
  }

  @All('analytics/*path')
  @UseGuards(OptionalJwtGuard, UserRateLimitGuard)
  async proxyAnalytics(@Req() request: Request, @Res() response: Response) {
    return this.proxy('analytics', request, response);
  }

  @All('chatbot/*path')
  @UseGuards(OptionalJwtGuard, UserRateLimitGuard)
  async proxyChatbot(@Req() request: Request, @Res() response: Response) {
    return this.proxy('chatbot', request, response);
  }

  private async proxy(
    serviceName: 'auth' | 'upload' | 'analytics' | 'chatbot',
    request: Request,
    response: Response,
  ) {
    try {
      // Extract path from request URL
      // request.url includes the full path: /api/analytics/summary
      let urlPath = request.url;
      
      // Remove query string for path extraction
      if (urlPath.includes('?')) {
        urlPath = urlPath.split('?')[0];
      }
      
      // Extract path after /api/ (keep service name in path)
      // e.g., /api/analytics/summary -> /analytics/summary
      // e.g., /api/auth/login -> /auth/login
      const apiPrefix = '/api/';
      let servicePath: string;
      
      if (urlPath.startsWith(apiPrefix)) {
        // Extract everything after /api/
        servicePath = urlPath.substring(apiPrefix.length - 1); // Keep the leading /
      } else {
        // Fallback
        servicePath = '/';
      }
      
      // Ensure servicePath starts with /
      if (!servicePath.startsWith('/')) {
        servicePath = `/${servicePath}`;
      }

      // For auth service, normalize to /v1/auth/{endpoint}
      // Exception: /health endpoint is not versioned (VERSION_NEUTRAL)
      if (serviceName === 'auth') {
        // Health endpoint is not versioned: /auth/health -> /health
        // Check if path is exactly /auth/health or ends with /health without version prefix
        if (servicePath === '/auth/health' || 
            (servicePath.endsWith('/health') && !servicePath.match(/\/v\d+\//))) {
          servicePath = '/health';
        } else {
          // Remove any existing version and /auth prefix to get the clean endpoint
          const endpointPath = servicePath
            .replace(/^\/v\d+\//, '/')      // Remove version prefix (e.g., /v1/)
            .replace(/^\/auth\//, '/');     // Remove /auth prefix if present
          
          // Always use /v1/auth/{endpoint}
          servicePath = `/v1/auth${endpointPath}`;
        }
      }

      // Debug logging
      console.log('Proxy Debug:', {
        originalUrl: request.url,
        serviceName,
        extractedPath: servicePath,
        method: request.method,
      });

      const proxyResponse = await this.proxyService.proxyRequest(
        serviceName,
        servicePath,
        request,
      );

      // Forward status code
      response.status(proxyResponse.status);

      // Forward headers (exclude hop-by-hop headers)
      const headersToExclude = [
        'connection',
        'keep-alive',
        'transfer-encoding',
        'upgrade',
        'host',
      ];

      Object.keys(proxyResponse.headers).forEach((key) => {
        if (!headersToExclude.includes(key.toLowerCase())) {
          const value = proxyResponse.headers[key];
          if (value) {
            response.setHeader(key, Array.isArray(value) ? value[0] : value);
          }
        }
      });

      // Send response body
      response.send(proxyResponse.data);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_GATEWAY,
          message: `Failed to proxy request to ${serviceName} service`,
          error: 'Bad Gateway',
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
