import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction, TransactionDocument } from '../transactions/schemas/transaction.schema';
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

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
  ) {}

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
}
