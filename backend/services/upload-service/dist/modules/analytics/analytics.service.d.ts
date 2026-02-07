import { Model } from 'mongoose';
import { TransactionDocument } from '../transactions/schemas/transaction.schema';
import { TransactionCategory } from '../../common/constants';
export interface CategorySpending {
    category: TransactionCategory;
    total: number;
    percentage: number;
}
export interface MonthlyTrend {
    month: string;
    year: number;
    totalSpending: number;
    topCategory: TransactionCategory;
    topCategoryAmount: number;
    isAnomaly?: boolean;
}
export declare class AnalyticsService {
    private readonly transactionModel;
    constructor(transactionModel: Model<TransactionDocument>);
    getCategorySpending(userId: string): Promise<CategorySpending[]>;
    getMonthlyTrends(userId: string): Promise<MonthlyTrend[]>;
}
