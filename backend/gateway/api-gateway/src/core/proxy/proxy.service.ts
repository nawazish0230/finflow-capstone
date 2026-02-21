import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Request } from 'express';

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async proxyRequest(
    serviceName: 'auth' | 'upload' | 'analytics' | 'chatbot',
    path: string,
    request: Request,
  ): Promise<AxiosResponse> {
    const serviceUrl = this.configService.get<string>(
      `services.${serviceName}`,
    );

    if (!serviceUrl) {
      throw new Error(`Service URL not configured for ${serviceName}`);
    }

    const targetUrl = `${serviceUrl}${path}`;
    const method = request.method.toLowerCase() as
      | 'get'
      | 'post'
      | 'put'
      | 'patch'
      | 'delete';

    // Prepare headers (forward relevant headers, exclude host)
    const headers: Record<string, string> = {};
    
    // Forward authorization header
    if (request.headers.authorization) {
      headers['authorization'] = request.headers.authorization;
    }

    // Forward content-type
    if (request.headers['content-type']) {
      headers['content-type'] = request.headers['content-type'];
    }

    // Forward correlation ID if present
    if (request.headers['x-correlation-id']) {
      headers['x-correlation-id'] = request.headers['x-correlation-id'] as string;
    }

    // Forward user agent
    if (request.headers['user-agent']) {
      headers['user-agent'] = request.headers['user-agent'];
    }

    // Debug logging
    this.logger.log({
      message: 'Proxying request',
      service: serviceName,
      method,
      path,
      targetUrl,
      serviceUrl,
    });

    const config: AxiosRequestConfig = {
      method,
      url: targetUrl,
      headers,
      validateStatus: () => true, // Don't throw on any status
    };

    // Add body for POST, PUT, PATCH
    if (['post', 'put', 'patch'].includes(method) && request.body) {
      config.data = request.body;
    }

    // Add query parameters
    if (Object.keys(request.query).length > 0) {
      config.params = request.query;
    }

    this.logger.debug({
      message: 'Proxying request',
      service: serviceName,
      method,
      path,
      targetUrl,
    });

    try {
      const response = await firstValueFrom(
        this.httpService.request(config),
      );

      return response;
    } catch (error) {
      this.logger.error({
        message: 'Proxy request failed',
        service: serviceName,
        path,
        error: error.message,
      });
      throw error;
    }
  }
}
