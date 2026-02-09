import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import type { SignOptions } from "jsonwebtoken";
import { JwtStrategy } from "./strategies/jwt.strategy";

/**
 * JWT verification only. Validates Bearer token (issued by auth-service).
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const expiresIn = config.get<string>("jwt.expiresIn") ?? "12h";
        return {
          secret: config.get<string>("jwt.secret") ?? "change-me-in-production",
          signOptions: { expiresIn } as SignOptions,
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [JwtStrategy],
  exports: [JwtModule],
})
export class AuthModule {}
