import { Module } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { ChatbotController } from './chatbot.controller';
import { TransactionsModule } from '../transactions/transactions.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [TransactionsModule, AnalyticsModule],
  controllers: [ChatbotController],
  providers: [ChatbotService],
  exports: [ChatbotService],
})
export class ChatbotModule {}
