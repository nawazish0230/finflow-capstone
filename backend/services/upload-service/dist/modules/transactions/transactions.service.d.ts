import { Model } from 'mongoose';
import { TransactionDocument } from './schemas/transaction.schema';
import { TransactionCategory } from '../../common/constants';
import { ListTransactionsDto } from './dto/list-transactions.dto';
import { KafkaProducerService } from '../../core/kafka/kafka-producer.service';
export interface TransactionSummary {
    totalDebit: number;
    totalCredit: number;
    totalTransactions: number;
}
export declare class TransactionsService {
    private readonly transactionModel;
    private readonly kafkaProducer;
    constructor(transactionModel: Model<TransactionDocument>, kafkaProducer: KafkaProducerService);
    createMany(userId: string, documentId: string, transactions: Array<{
        date: Date;
        description: string;
        amount: number;
        type: 'debit' | 'credit';
        category: TransactionCategory;
        rawMerchant?: string;
    }>): Promise<number>;
    getSummary(userId: string): Promise<TransactionSummary>;
    list(userId: string, dto: ListTransactionsDto): Promise<{
        items: TransactionDocument[];
        total: number;
        page: number;
        limit: number;
    }>;
}
