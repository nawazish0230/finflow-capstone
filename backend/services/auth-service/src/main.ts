import { NestFactory } from "@nestjs/core";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { AppModule } from "./app.module";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";

const config = new DocumentBuilder()
  .setTitle("Finflow Auth Service")
  .setDescription("API documentation for the Finflow Auth Service")
  .setVersion("1.0")
  .addTag("auth")
  .build();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
  });

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`API documentation available at http://localhost:${port}/api`);
  console.log(`Auth service listening on port ${port}`);
}

bootstrap();
