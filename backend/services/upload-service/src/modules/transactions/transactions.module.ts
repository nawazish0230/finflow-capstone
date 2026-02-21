import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TransactionsService } from './transactions.service';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import { KafkaModule } from '../../core/kafka/kafka.module';
import { EnhancedCategorizationService } from './services/enhanced-categorization.service';
import { DuplicateDetectionService } from './services/duplicate-detection.service';
import { GroqCategorizationService } from './services/groq-categorization.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Transaction.name, schema: TransactionSchema }]),
    KafkaModule,
  ],
  providers: [
    TransactionsService,
    EnhancedCategorizationService,
    DuplicateDetectionService,
    GroqCategorizationService, // Optional - will work even if API key is missing
  ],
  exports: [
    TransactionsService,
    EnhancedCategorizationService,
    DuplicateDetectionService,
    GroqCategorizationService,
  ],
})
export class TransactionsModule {}
