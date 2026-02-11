import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsString, Min, validateSync } from 'class-validator';

enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvSchema {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsNumber()
  @Min(1)
  PORT: number = 3000;

  @IsString()
  MONGODB_URI: string = 'mongodb://localhost:27017/finflow_upload';

  @IsString()
  JWT_SECRET: string = 'change-me-in-production';
}

export function validateEnv(config: Record<string, unknown>): EnvSchema {
  const validated = plainToInstance(EnvSchema, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(
      errors
        .map((e) => Object.values(e.constraints ?? {}))
        .flat()
        .join(', '),
    );
  }
  return validated;
}
