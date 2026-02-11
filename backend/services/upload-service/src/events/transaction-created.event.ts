import type { TransactionCategory } from '../common/constants';

export interface TransactionCreatedEvent {
  id: string;
  userId: string;
  documentId: string;
  date: string; // ISO string
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  category: TransactionCategory;
  rawMerchant?: string | null;
}
