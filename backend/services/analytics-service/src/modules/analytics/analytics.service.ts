import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Transaction, TransactionDocument } from "./schemas/transaction.schema";
import { TransactionCategory } from "../../common/constants";
import type { TransactionCreatedEvent } from "../../events/transaction-created.event";

export interface CategorySpending {
  category: TransactionCategory;
  total: number;
  percentage: number;
  transactions: TransactionRecord[];
}

/** Line chart format: { labels: ['Jan', 'Feb', ...], datasets: [{ data: [2200, 2800, ...] }] } */
export interface MonthlyExpenseLineData {
  labels: string[];
  datasets: Array<{ data: number[] }>;
}

export interface HighestMonthExpense {
  month: string;
  amount: number;
}

export interface TopCategorySpend {
  category: TransactionCategory;
  percentage: number;
}

export interface InsightsSummary {
  totalDebit: number;
  totalCredit: number;
  transactionCount: number;
  highestMonthExpense: HighestMonthExpense | null;
  topCategorySpend: TopCategorySpend | null;
}

export interface TransactionRecord {
  _id: string;
  userId: string;
  documentId: string;
  date: Date;
  description: string;
  amount: number;
  type: "debit" | "credit";
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
    private readonly transactionModel: Model<TransactionDocument>
  ) {}

  private readonly monthNames = [
    "",
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  async getSummary(userId: string): Promise<InsightsSummary> {
    const [facetResult] = await this.transactionModel.aggregate<{
      summary: Array<{
        totalDebit: number;
        totalCredit: number;
        totalTransactions: number;
      }>;
      byMonth: Array<{ _id: { year: number; month: number }; total: number }>;
      byCategory: Array<{ _id: TransactionCategory; total: number }>;
    }>([
      { $match: { userId } },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                totalDebit: {
                  $sum: { $cond: [{ $eq: ["$type", "debit"] }, "$amount", 0] },
                },
                totalCredit: {
                  $sum: {
                    $cond: [{ $eq: ["$type", "credit"] }, "$amount", 0],
                  },
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
          ],
          byMonth: [
            { $match: { type: "debit" } },
            {
              $group: {
                _id: { year: { $year: "$date" }, month: { $month: "$date" } },
                total: { $sum: "$amount" },
              },
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
          ],
          byCategory: [
            { $match: { type: "debit" } },
            { $group: { _id: "$category", total: { $sum: "$amount" } } },
            { $sort: { total: -1 } },
          ],
        },
      },
    ]);

    const summary = facetResult?.summary?.[0];
    const totalDebit = summary?.totalDebit ?? 0;
    const totalCredit = summary?.totalCredit ?? 0;
    const transactionCount = summary?.totalTransactions ?? 0;
    const byMonth = facetResult?.byMonth ?? [];
    const byCategory = facetResult?.byCategory ?? [];

    const highestMonthExpense: InsightsSummary["highestMonthExpense"] =
      byMonth.length === 0
        ? null
        : (() => {
            const max = byMonth.reduce((best, m) =>
              m.total > best.total ? m : best
            );
            return {
              month: `${this.monthNames[max._id.month]} ${max._id.year}`,
              amount: max.total,
            };
          })();

    const categoryGrandTotal = byCategory.reduce((s, c) => s + c.total, 0);
    const topCategorySpend: InsightsSummary["topCategorySpend"] =
      byCategory.length === 0 || categoryGrandTotal === 0
        ? null
        : {
            category: byCategory[0]._id,
            percentage:
              Math.round((byCategory[0].total / categoryGrandTotal) * 10000) /
              100,
          };

    return {
      totalDebit,
      totalCredit,
      transactionCount,
      highestMonthExpense,
      topCategorySpend,
    };
  }

  async getAllTransactions(
    userId: string,
    category?: string
  ): Promise<CategorySpending[]> {
    const matchFilter: Record<string, unknown> = { userId, type: "debit" };
    if (category) {
      matchFilter.category = category;
    }

    const result = await this.transactionModel.aggregate<{
      _id: TransactionCategory;
      total: number;
      transactions: TransactionRecord[];
    }>([
      { $match: matchFilter },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
          transactions: {
            $push: {
              _id: "$_id",
              userId: "$userId",
              documentId: "$documentId",
              date: "$date",
              description: "$description",
              amount: "$amount",
              type: "$type",
              category: "$category",
              rawMerchant: "$rawMerchant",
            },
          },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const grandTotal = result.reduce((s, r) => s + r.total, 0);

    return result.map((r) => ({
      category: r._id,
      total: r.total,
      percentage: grandTotal > 0 ? Math.round((r.total / grandTotal) * 100) : 0,
      transactions: r.transactions,
    }));
  }

  async getMonthlyExpense(userId: string): Promise<MonthlyExpenseLineData> {
    const byMonth = await this.transactionModel.aggregate<{
      _id: { year: number; month: number };
      total: number;
    }>([
      { $match: { userId, type: "debit" } },
      {
        $group: {
          _id: { year: { $year: "$date" }, month: { $month: "$date" } },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);
    const labels = byMonth.map(
      (m) => `${this.monthNames[m._id.month]} ${m._id.year}`
    );
    const data = byMonth.map((m) => m.total);
    return {
      labels,
      datasets: [{ data }],
    };
  }

  async getTransactionsPaginated(
    userId: string,
    filters: {
      search?: string;
      category?: TransactionCategory;
      type?: "debit" | "credit";
      startDate?: Date;
      endDate?: Date;
      page?: number;
      pageSize?: number;
    }
  ): Promise<PaginatedTransactions> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
    const match: Record<string, unknown> = { userId };
    if (filters.category) match.category = filters.category;
    if (filters.type) match.type = filters.type;
    if (filters.startDate || filters.endDate) {
      match.date = {};
      if (filters.startDate)
        (match.date as Record<string, Date>).$gte = filters.startDate;
      if (filters.endDate)
        (match.date as Record<string, Date>).$lte = filters.endDate;
    }
    if (filters.search?.trim()) {
      const search = filters.search.trim();
      match.$or = [
        { description: { $regex: search, $options: "i" } },
        { rawMerchant: { $regex: search, $options: "i" } },
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

  async upsertTransactionFromEvent(
    event: TransactionCreatedEvent
  ): Promise<void> {
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
      { upsert: true }
    );
  }
}
