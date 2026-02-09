import { IsArray, IsDateString, IsNumber, IsOptional, IsString, IsIn, MinLength } from 'class-validator';

const CATEGORIES = ['Food', 'Travel', 'Shopping', 'Bills', 'Entertainment', 'OnlinePayments', 'Others'] as const;
const TYPES = ['debit', 'credit'] as const;

export class SyncTransactionItemDto {
  @IsDateString()
  date: string;

  @IsString()
  @MinLength(1)
  description: string;

  @IsNumber()
  amount: number;

  @IsIn(TYPES)
  type: 'debit' | 'credit';

  @IsIn(CATEGORIES)
  category: (typeof CATEGORIES)[number];

  @IsOptional()
  @IsString()
  rawMerchant?: string;
}

export class SyncTransactionsDto {
  @IsString()
  @MinLength(1)
  userId: string;

  @IsString()
  @MinLength(1)
  documentId: string;

  @IsArray()
  transactions: SyncTransactionItemDto[];
}
