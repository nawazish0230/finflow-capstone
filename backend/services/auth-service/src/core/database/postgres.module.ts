import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../../modules/auth/entities/user.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('postgres.host') ?? 'localhost',
        port: config.get<number>('postgres.port') ?? 5432,
        username: config.get<string>('postgres.username') ?? 'postgres',
        password: config.get<string>('postgres.password') ?? 'postgres',
        database: config.get<string>('postgres.database') ?? 'finflow_auth',
        entities: [User],
        synchronize: config.get<string>('nodeEnv') === 'development',
        logging: false, // Disable all query logging
        // Disable SSL for Docker-to-Docker connections (containers on same network)
        // Enable SSL only for external/managed database services
        ssl: config.get<string>('postgres.ssl') === 'true' 
          ? { rejectUnauthorized: false }
          : false,
      }),
      inject: [ConfigService],
    }),
  ],
})
export class PostgresModule {}
