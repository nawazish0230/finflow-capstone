import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get config service
  const configService = app.get(ConfigService);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS configuration
  const corsOrigin = configService.get<string>('cors.origin');
  app.enableCors({
    origin: corsOrigin === '*' ? true : corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
  });

  const port = configService.get<number>('port') ?? 3000;
  await app.listen(port);

  console.log(`🚀 API Gateway listening on port ${port}`);
  console.log(`📡 Routes:`);
  console.log(`   - /api/auth/* → Auth Service`);
  console.log(`   - /api/upload/* → Upload Service`);
  console.log(`   - /api/analytics/* → Analytics Service`);
  console.log(`   - /api/chatbot/* → Chatbot Service`);
  console.log(`🏥 Health Checks:`);
  console.log(`   - GET /health → Aggregate health check (all services)`);
  console.log(`   - GET /health/gateway → Gateway health only`);
  console.log(`   - GET /api/auth/health → Auth service health`);
  console.log(`   - GET /api/upload/health → Upload service health`);
  console.log(`   - GET /api/analytics/health → Analytics service health`);
  console.log(`   - GET /api/chatbot/health → Chatbot service health`);
}

bootstrap();
