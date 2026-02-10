import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction, TransactionDocument } from './schemas/transaction.schema';
import { TransactionCategory } from '../../common/constants';
import type { TransactionCreatedEvent } from '../../events/transaction-created.event';

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
  ) {}

  async getSummary(userId: string): Promise<InsightsSummary> {
    const [summary] = await this.transactionModel.aggregate<{
      totalDebit: number;
      totalCredit: number;
      totalTransactions: number;
    }>([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalDebit: {
            $sum: { $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0] },
          },
          totalCredit: {
            $sum: { $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0] },
          },
          totalTransactions: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          totalDebit: 1,
          totalCredit: 1,
          totalTransactions: 1,
        },
      },
    ]);
    return {
      totalDebit: summary?.totalDebit ?? 0,
      totalCredit: summary?.totalCredit ?? 0,
      transactionCount: summary?.totalTransactions ?? 0,
    };
  }

  async getCategorySpending(userId: string): Promise<CategorySpending[]> {
    const result = await this.transactionModel.aggregate<{ _id: TransactionCategory; total: number }>([
      { $match: { userId, type: 'debit' } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]);
    const grandTotal = result.reduce((s, r) => s + r.total, 0);
    return result.map((r) => ({
      category: r._id,
      total: r.total,
      percentage: grandTotal > 0 ? Math.round((r.total / grandTotal) * 10000) / 100 : 0,
    }));
  }

  async getMonthlyTrends(userId: string): Promise<MonthlyTrend[]> {
    interface MonthDoc {
      _id: { year: number; month: number };
      total: number;
      categories: Array<{ category: TransactionCategory; amount: number }>;
    }
    const byMonth = await this.transactionModel.aggregate<MonthDoc>([
      { $match: { userId, type: 'debit' } },
      {
        $group: {
          _id: { year: { $year: '$date' }, month: { $month: '$date' } },
          total: { $sum: '$amount' },
          categories: { $push: { category: '$category', amount: '$amount' } },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const totals = byMonth.map((m) => m.total);
    const mean = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;
    const variance =
      totals.length > 1 ? totals.reduce((s, t) => s + (t - mean) ** 2, 0) / (totals.length - 1) : 0;
    const std = Math.sqrt(variance);
    const threshold = mean + 2 * std;

    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return byMonth.map((m) => {
      const categorySums = (m.categories ?? []).reduce<Record<string, number>>(
        (acc, c) => {
          acc[c.category] = (acc[c.category] ?? 0) + c.amount;
          return acc;
        },
        {},
      );
      const entries = Object.entries(categorySums) as [string, number][];
      const top = entries.sort((a, b) => b[1] - a[1])[0];
      const topCategoryAmount = typeof top?.[1] === 'number' ? top[1] : 0;
      return {
        month: monthNames[m._id.month],
        year: m._id.year,
        totalSpending: m.total,
        topCategory: (top?.[0] ?? 'Others') as TransactionCategory,
        topCategoryAmount,
        isAnomaly: m.total > threshold,
      };
    });
  }

  async getTransactionsPaginated(
    userId: string,
    filters: {
      search?: string;
      category?: TransactionCategory;
      type?: 'debit' | 'credit';
      startDate?: Date;
      endDate?: Date;
      page?: number;
      pageSize?: number;
    },
  ): Promise<PaginatedTransactions> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
    const match: Record<string, unknown> = { userId };
    if (filters.category) match.category = filters.category;
    if (filters.type) match.type = filters.type;
    if (filters.startDate || filters.endDate) {
      match.date = {};
      if (filters.startDate) (match.date as Record<string, Date>).$gte = filters.startDate;
      if (filters.endDate) (match.date as Record<string, Date>).$lte = filters.endDate;
    }
    if (filters.search?.trim()) {
      const search = filters.search.trim();
      match.$or = [
        { description: { $regex: search, $options: 'i' } },
        { rawMerchant: { $regex: search, $options: 'i' } },
      ];
    }
    const [rawData, total] = await Promise.all([
      this.transactionModel
        .find(match)
        .sort({ date: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean()
        .exec(),
      this.transactionModel.countDocuments(match),
    ]);
    const data: TransactionRecord[] = rawData.map((doc) => ({
      _id: String((doc as { _id: unknown })._id),
      userId: doc.userId,
      documentId: doc.documentId,
      date: doc.date,
      description: doc.description,
      amount: doc.amount,
      type: doc.type,
      category: doc.category,
      rawMerchant: doc.rawMerchant,
    }));
    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }
  
  async upsertTransactionFromEvent(event: TransactionCreatedEvent): Promise<void> {
    await this.transactionModel.updateOne(
      { _id: event.id },
      {
        $set: {
          userId: event.userId,
          documentId: event.documentId,
          date: new Date(event.date),
          description: event.description,
          amount: event.amount,
          type: event.type,
          category: event.category,
          rawMerchant: event.rawMerchant ?? null,
        },
      },
      { upsert: true },
    );
  }
}
