import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { TransactionsController } from './transactions.controller';
import { SyncController } from './sync.controller';
import { InternalApiGuard } from '../../common/guards/internal-api.guard';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Transaction.name, schema: TransactionSchema }]),
  ],
  controllers: [AnalyticsController, TransactionsController, SyncController],
  providers: [AnalyticsService, InternalApiGuard],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
