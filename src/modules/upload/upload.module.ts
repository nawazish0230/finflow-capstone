import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import {
  DocumentUpload,
  DocumentUploadSchema,
} from './schemas/document.schema';
import { TransactionsModule } from '../transactions/transactions.module';
import { StorageModule } from './storage/storage.module';
import { TransactionParserService } from './services/transaction-parser.service';
import { User, UserSchema } from '../auth/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DocumentUpload.name, schema: DocumentUploadSchema },
      { name: User.name, schema: UserSchema },
    ]),
    TransactionsModule,
    StorageModule,
  ],
  controllers: [UploadController],
  providers: [UploadService, TransactionParserService],
  exports: [UploadService, TransactionParserService],
})
export class UploadModule {}
