import { Module } from '@nestjs/common';
import { KafkaConsumerService } from './kafka-consumer.service';
import { AnalyticsModule } from '../../modules/analytics/analytics.module';

@Module({
  imports: [AnalyticsModule],
  providers: [KafkaConsumerService],
})
export class KafkaModule {}

