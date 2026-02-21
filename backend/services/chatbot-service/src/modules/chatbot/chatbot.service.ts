import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Transaction, TransactionDocument } from './schemas/transaction.schema';
import { Model } from 'mongoose';
import { TransactionCreatedEvent } from '../../events/transaction-created.event';
import { GroqChatbotService } from './services/groq-chatbot.service';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
    private readonly groqChatbotService: GroqChatbotService,
  ) {}

  async getChatbotResponse(
    userId: string,
    question: string,
  ): Promise<{ answer: string }> {
    // Get financial summary and recent transactions
    const summary = await this.getSummary(userId);
    const recentTransactions = await this.transactionModel
      .find({ userId })
      .sort({ date: -1 })
      .limit(5)
      .lean()
      .exec();

    const financialContext = {
      ...summary,
      recentTransactions: recentTransactions.map((t) => ({
        description: t.description,
        amount: t.amount,
        category: t.category,
        date: t.date,
      })),
    };

    // Step 1: Check if Groq is available and question matches predefined questions
    if (this.groqChatbotService.isAvailable()) {
      const predefinedQuestion =
        this.groqChatbotService.findMatchingQuestion(question);

      if (predefinedQuestion) {
        this.logger.log(
          `Using Groq to answer predefined question: ${predefinedQuestion.question}`,
        );

        const groqAnswer = await this.groqChatbotService.getAnswerFromGroq(
          predefinedQuestion,
          question,
          financialContext,
        );

        if (groqAnswer) {
          return { answer: groqAnswer };
        }

        // If Groq fails, fall through to keyword-based logic
        this.logger.warn('Groq failed to answer predefined question, using fallback');
      } else {
        // Try Groq for general questions (not predefined)
        this.logger.debug('Trying Groq for general question');
        const groqAnswer = await this.groqChatbotService.getGeneralAnswer(
          question,
          financialContext,
        );

        if (groqAnswer) {
          return { answer: groqAnswer };
        }

        // If Groq fails, fall through to keyword-based logic
        this.logger.debug('Groq failed to answer, using keyword-based fallback');
      }
    }

    // Step 2: Fallback to keyword-based responses (existing logic)
    const q = question.toLowerCase();
    if (q.includes('most') && (q.includes('spend') || q.includes('money'))) {
      const answer = `You're spending most on **₹${summary.totalDebit.toFixed(2)}** total debits and **₹${summary.totalCredit.toFixed(2)}** total credits.`;
      return { answer };
    }
    if (q.includes('summar') || q.includes('simple')) {
      const answer = `You have **${summary.totalTransactions}** transactions: **₹${summary.totalDebit.toFixed(2)}** total debits and **₹${summary.totalCredit.toFixed(2)}** total credits.`;
      return { answer };
    }
    if (q.includes('save') || q.includes('suggest')) {
      const answer = `Consider reviewing **₹${summary.totalDebit.toFixed(2)}** total debits and **₹${summary.totalCredit.toFixed(2)}** total credits. This is not financial advice—please consult a professional for savings plans.`;
      return { answer };
    }

    // Step 3: Default response with suggestions
    return {
      answer: `Based on your data: ${summary.totalTransactions} transactions, ₹${summary.totalDebit.toFixed(2)} total debits. 

You can ask me about:
- **Spending & Expenses**: "How can I reduce my spending?"
- **Budgeting**: "How should I create a budget?"
- **Savings**: "What are the best ways to save money?"
- **Investments**: "How should I start investing?"
- **Debt Management**: "How can I manage my debt?"
- **Financial Planning**: "What are the basics of personal finance?"

Or ask: "Where am I spending most?", "Summarize my expenses"`,
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
