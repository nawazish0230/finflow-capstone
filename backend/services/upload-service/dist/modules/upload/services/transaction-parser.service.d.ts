import type { TransactionCategory } from '../../../common/constants';
export interface ParsedTransaction {
    date: Date;
    description: string;
    amount: number;
    type: 'debit' | 'credit';
    category: TransactionCategory;
    rawMerchant?: string;
}
export declare class TransactionParserService {
    private readonly logger;
    parsePdf(buffer: Buffer, password?: string): Promise<ParsedTransaction[]>;
    private parseTransactionsFromText;
    private parseDate;
    categorizeTransaction(description: string): TransactionCategory;
    categorizeTransactions(transactions: Array<{
        description: string;
    }>): TransactionCategory[];
}
