import { Global, Module } from '@nestjs/common';
import { AnalyticsClientService } from './analytics-client.service';

@Global()
@Module({
  providers: [AnalyticsClientService],
  exports: [AnalyticsClientService],
})
export class AnalyticsClientModule {}
