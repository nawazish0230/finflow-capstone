import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction, TransactionDocument } from './schemas/transaction.schema';
import { TransactionCategory } from '../../common/constants';
import { PAGINATION } from '../../common/constants';
import { ListTransactionsDto } from './dto/list-transactions.dto';

export interface TransactionSummary {
  totalDebit: number;
  totalCredit: number;
  totalTransactions: number;
}

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
  ) {}

  async createMany(
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
    // console.log({ transactions });
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

  async getSummary(userId: string): Promise<TransactionSummary> {
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
    return (
      summary ?? {
        totalDebit: 0,
        totalCredit: 0,
        totalTransactions: 0,
      }
    );
  }

  async list(
    userId: string,
    dto: ListTransactionsDto,
  ): Promise<{
    items: TransactionDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(
      PAGINATION.DEFAULT_PAGE,
      dto.page ?? PAGINATION.DEFAULT_PAGE,
    );
    const limit = Math.min(
      PAGINATION.MAX_LIMIT,
      dto.limit ?? PAGINATION.DEFAULT_LIMIT,
    );
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { userId };
    if (dto.category) filter.category = dto.category;
    if (dto.type) filter.type = dto.type;
    if (dto.dateFrom || dto.dateTo) {
      filter.date = {};
      if (dto.dateFrom)
        (filter.date as Record<string, Date>).$gte = new Date(dto.dateFrom);
      if (dto.dateTo)
        (filter.date as Record<string, Date>).$lte = new Date(dto.dateTo);
    }
    if (dto.search) {
      filter.$or = [
        { description: new RegExp(dto.search, 'i') },
        { rawMerchant: new RegExp(dto.search, 'i') },
      ];
    }

    const [items, total] = await Promise.all([
      this.transactionModel
        .find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.transactionModel.countDocuments(filter),
    ]);

    return { items: items as TransactionDocument[], total, page, limit };
  }
}
