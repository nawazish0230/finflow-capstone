import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction, TransactionDocument } from './schemas/transaction.schema';
import { TransactionCategory } from '../../common/constants';
import { UploadClientService } from '../upload-client/upload-client.service';

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

export interface InsightsSummary {
  totalDebit: number;
  totalCredit: number;
  transactionCount: number;
}

export interface TransactionRecord {
  _id: string;
  userId: string;
  documentId: string;
  date: Date;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  category: TransactionCategory;
  rawMerchant?: string;
}

export interface PaginatedTransactions {
  data: TransactionRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
    private readonly uploadClient: UploadClientService,
  ) {}

  async getSummary(userId: string, authToken: string): Promise<InsightsSummary> {
    const summary = await this.uploadClient.getTransactionsSummary(userId, authToken);
    console.log('summary', summary);
    return {
      totalDebit: summary.totalDebit,
      totalCredit: summary.totalCredit,
      transactionCount: summary.totalTransactions,
    };
  }

  async getCategorySpending(userId: string, authToken: string): Promise<CategorySpending[]> {
    const transactions = await this.uploadClient.getAllTransactionsForUser(userId, authToken, {
      type: 'debit',
    });

    const categoryMap = new Map<TransactionCategory, number>();
    transactions.forEach((t) => {
      const current = categoryMap.get(t.category) ?? 0;
      categoryMap.set(t.category, current + t.amount);
    });

    const result = Array.from(categoryMap.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);

    const grandTotal = result.reduce((s, r) => s + r.total, 0);
    return result.map((r) => ({
      category: r.category,
      total: r.total,
      percentage: grandTotal > 0 ? Math.round((r.total / grandTotal) * 10000) / 100 : 0,
    }));
  }

  async getMonthlyTrends(userId: string, authToken: string): Promise<MonthlyTrend[]> {
    const transactions = await this.uploadClient.getAllTransactionsForUser(userId, authToken, {
      type: 'debit',
    });

    const monthMap = new Map<string, { year: number; month: number; total: number; categories: Map<TransactionCategory, number> }>();

    transactions.forEach((t) => {
      const date = new Date(t.date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const key = `${year}-${month}`;

      if (!monthMap.has(key)) {
        monthMap.set(key, { year, month, total: 0, categories: new Map() });
      }

      const monthData = monthMap.get(key)!;
      monthData.total += t.amount;
      const categoryTotal = monthData.categories.get(t.category) ?? 0;
      monthData.categories.set(t.category, categoryTotal + t.amount);
    });

    const byMonth = Array.from(monthMap.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    const totals = byMonth.map((m) => m.total);
    const mean = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;
    const variance =
      totals.length > 1 ? totals.reduce((s, t) => s + (t - mean) ** 2, 0) / (totals.length - 1) : 0;
    const std = Math.sqrt(variance);
    const threshold = mean + 2 * std;

    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return byMonth.map((m) => {
      const categoryEntries = Array.from(m.categories.entries());
      const top = categoryEntries.sort((a, b) => b[1] - a[1])[0];
      const topCategoryAmount = top?.[1] ?? 0;
      return {
        month: monthNames[m.month],
        year: m.year,
        totalSpending: m.total,
        topCategory: (top?.[0] ?? 'Others') as TransactionCategory,
        topCategoryAmount,
        isAnomaly: m.total > threshold,
      };
    });
  }

  // Removed: getTransactionsPaginated is now handled directly by TransactionsController
  // which proxies to upload-service

  /** Internal: sync transactions from upload-service into analytics DB. */
  async syncTransactions(
    userId: string,
    documentId: string,
    transactions: Array<{
      date: Date;
      description: string;
      amount: number;
      type: 'debit' | 'credit';
      category: TransactionCategory;
      rawMerchant?: string;
    }>,
  ): Promise<number> {
    const docs = transactions.map((t) => ({
      userId,
      documentId,
      date: t.date,
      description: t.description,
      amount: t.amount,
      type: t.type,
      category: t.category,
      rawMerchant: t.rawMerchant,
    }));
    const result = await this.transactionModel.insertMany(docs);
    return result.length;
  }
}
