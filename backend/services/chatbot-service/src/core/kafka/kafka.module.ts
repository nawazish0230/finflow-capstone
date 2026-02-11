import { Module } from '@nestjs/common';
import { KafkaConsumerService } from './kafka-consumer.service';
import { ChatbotModule } from '../../modules/chatbot/chatbot.module';

@Module({
  imports: [ChatbotModule],
  providers: [KafkaConsumerService],
})
export class KafkaModule {}