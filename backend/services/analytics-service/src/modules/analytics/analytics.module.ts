import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { SyncController } from './sync.controller';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import { InternalApiGuard } from '../../common/guards/internal-api.guard';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Transaction.name, schema: TransactionSchema }]),
  ],
  controllers: [AnalyticsController, SyncController],
  providers: [AnalyticsService, InternalApiGuard],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
