import { Injectable } from '@nestjs/common';
import { TransactionsService } from '../transactions/transactions.service';
import { AnalyticsService } from '../analytics/analytics.service';

@Injectable()
export class ChatbotService {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async getInsight(userId: string, question: string): Promise<{ answer: string }> {
    const [summary, categorySpending, monthlyTrends] = await Promise.all([
      this.transactionsService.getSummary(userId),
      this.analyticsService.getCategorySpending(userId),
      this.analyticsService.getMonthlyTrends(userId),
    ]);

    const q = question.toLowerCase();
    if (q.includes('most') && (q.includes('spend') || q.includes('money'))) {
      const top = categorySpending[0];
      const answer = top
        ? `You're spending most on **${top.category}** (${top.percentage}% of debits, total ${top.total.toFixed(2)}).`
        : 'No spending data yet. Upload a statement to see insights.';
      return { answer };
    }
    if (q.includes('high') && (q.includes('last month') || q.includes('month'))) {
      const last = monthlyTrends[monthlyTrends.length - 1];
      const answer = last
        ? `Last month (${last.month} ${last.year}) you spent ${last.totalSpending.toFixed(2)}; top category was **${last.topCategory}**.${last.isAnomaly ? ' This month was notably higher than usual.' : ''}`
        : 'No monthly trend data yet.';
      return { answer };
    }
    if (q.includes('summar') || q.includes('simple')) {
      const answer = `You have **${summary.totalTransactions}** transactions: **${summary.totalDebit.toFixed(2)}** total debits and **${summary.totalCredit.toFixed(2)}** total credits.`;
      return { answer };
    }
    if (q.includes('save') || q.includes('suggest')) {
      const top = categorySpending[0];
      const answer = top
        ? `Consider reviewing **${top.category}** spending (${top.percentage}% of outgoings). This is not financial advice—please consult a professional for savings plans.`
        : 'Upload statements and ask "Where am I spending most?" to get tailored suggestions. This is not financial advice.';
      return { answer };
    }

    return {
      answer: `Based on your data: ${summary.totalTransactions} transactions, ${summary.totalDebit.toFixed(2)} total debits. Ask: "Where am I spending most?", "Summarize my expenses", or "Suggest areas to save."`,
    };
  }
}
