import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { TransactionsController } from './transactions.controller';
import { SyncController } from './sync.controller';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import { InternalApiGuard } from '../../common/guards/internal-api.guard';
import { UploadClientModule } from '../upload-client/upload-client.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Transaction.name, schema: TransactionSchema }]),
    UploadClientModule,
  ],
  controllers: [AnalyticsController, TransactionsController, SyncController],
  providers: [AnalyticsService, InternalApiGuard],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
