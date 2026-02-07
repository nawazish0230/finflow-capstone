import { HealthCheckService, MongooseHealthIndicator } from '@nestjs/terminus';
export declare class HealthController {
    private health;
    private mongoose;
    constructor(health: HealthCheckService, mongoose: MongooseHealthIndicator);
    check(): Promise<import("@nestjs/terminus").HealthCheckResult>;
}
