import { Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { GroqChatbotService } from './services/groq-chatbot.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
    ]),
  ],
  controllers: [ChatbotController],
  providers: [ChatbotService, GroqChatbotService],
  exports: [ChatbotService, GroqChatbotService],
})
export class ChatbotModule {}
