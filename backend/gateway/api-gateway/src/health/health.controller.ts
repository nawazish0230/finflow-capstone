import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Public } from '../common/decorators/public.decorator';

interface ServiceHealth {
  service: string;
  status: 'up' | 'down';
  responseTime?: number;
  error?: string;
  details?: any;
}

@Controller('health')
export class HealthController {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Get()
  async check() {
    const services = ['auth', 'upload', 'analytics', 'chatbot'] as const;
    const healthChecks = await Promise.allSettled(
      services.map((service) => this.checkService(service)),
    );

    const results: ServiceHealth[] = healthChecks.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return {
        service: services[index],
        status: 'down',
        error: result.reason?.message || 'Unknown error',
      };
    });

    const allUp = results.every((r) => r.status === 'up');
    const status = allUp ? 'healthy' : 'degraded';

    return {
      status,
      gateway: 'up',
      timestamp: new Date().toISOString(),
      services: results,
    };
  }

  @Public()
  @Get('gateway')
  gatewayHealth() {
    return {
      status: 'up',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
    };
  }

  private async checkService(
    serviceName: 'auth' | 'upload' | 'analytics' | 'chatbot',
  ): Promise<ServiceHealth> {
    const startTime = Date.now();
    const serviceUrl = this.configService.get<string>(
      `services.${serviceName}`,
    );

    if (!serviceUrl) {
      return {
        service: serviceName,
        status: 'down',
        error: 'Service URL not configured',
      };
    }

    try {
      // For auth service, health endpoint is at /health (not /v1/auth/health)
      let healthPath = '/health';
      if (serviceName === 'auth') {
        // Auth service health is at /health (not versioned)
        healthPath = '/health';
      }

      const response = await firstValueFrom(
        this.httpService.get(`${serviceUrl}${healthPath}`, {
          timeout: 5000,
          validateStatus: () => true,
        }),
      );

      const responseTime = Date.now() - startTime;

      if (response.status === 200) {
        return {
          service: serviceName,
          status: 'up',
          responseTime,
          details: response.data,
        };
      }

      return {
        service: serviceName,
        status: 'down',
        responseTime,
        error: `HTTP ${response.status}`,
        details: response.data,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        service: serviceName,
        status: 'down',
        responseTime,
        error: error.message || 'Connection failed',
      };
    }
  }
}
