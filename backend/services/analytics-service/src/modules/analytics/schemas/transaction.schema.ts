import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import type { TransactionCategory } from '../../../common/constants';

export type TransactionDocument = Transaction & Document;

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  documentId: string;

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, enum: ['debit', 'credit'] })
  type: 'debit' | 'credit';

  @Prop({ required: true, enum: ['Food', 'Travel', 'Shopping', 'Bills', 'Entertainment', 'OnlinePayments', 'Others'] })
  category: TransactionCategory;

  @Prop({ default: null })
  rawMerchant?: string;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

TransactionSchema.index({ userId: 1, date: -1 });
TransactionSchema.index({ userId: 1, category: 1 });
TransactionSchema.index({ userId: 1, documentId: 1 });
