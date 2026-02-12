import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Transaction, TransactionDocument } from './schemas/transaction.schema';
import { Model } from 'mongoose';
import { TransactionCreatedEvent } from '../../events/transaction-created.event';

@Injectable()
export class ChatbotService {
  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
  ) {}

  async getChatbotResponse(
    userId: string,
    question: string,
  ): Promise<{ answer: string }> {
    const [summary] = await Promise.all([this.getSummary(userId)]);

    const q = question.toLowerCase();
    if (q.includes('most') && (q.includes('spend') || q.includes('money'))) {
      const answer = `You're spending most on **${summary.totalDebit.toFixed(2)}** total debits and **${summary.totalCredit.toFixed(2)}** total credits.`;
      return { answer };
    }
    if (q.includes('summar') || q.includes('simple')) {
      const answer = `You have **${summary.totalTransactions}** transactions: **${summary.totalDebit.toFixed(2)}** total debits and **${summary.totalCredit.toFixed(2)}** total credits.`;
      return { answer };
    }
    if (q.includes('save') || q.includes('suggest')) {
      const answer = `Consider reviewing **${summary.totalDebit.toFixed(2)}** total debits and **${summary.totalCredit.toFixed(2)}** total credits. This is not financial advice—please consult a professional for savings plans.`;
      return { answer };
    }

    return {
      answer: `Based on your data: ${summary.totalTransactions} transactions, ${summary.totalDebit.toFixed(2)} total debits. Ask: "Where am I spending most?", "Summarize my expenses", or "Suggest areas to save."`,
    };
  }

  async upsertTransactionFromEvent(
    event: TransactionCreatedEvent,
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
      { upsert: true },
    );
  }

  async getSummary(userId: string): Promise<{
    totalDebit: number;
    totalCredit: number;
    totalTransactions: number;
  }> {
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
}
