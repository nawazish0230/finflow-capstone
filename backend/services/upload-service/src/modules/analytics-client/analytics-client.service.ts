import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CategorySpending {
  category: string;
  total: number;
  percentage: number;
}

export interface MonthlyTrend {
  month: string;
  year: number;
  totalSpending: number;
  topCategory: string;
  topCategoryAmount: number;
  isAnomaly?: boolean;
}

@Injectable()
export class AnalyticsClientService {
  private readonly logger = new Logger(AnalyticsClientService.name);
  private readonly baseUrl: string;
  private readonly internalApiKey: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('analytics.serviceUrl', 'http://localhost:3002').replace(/\/$/, '');
    this.internalApiKey = this.config.get<string>('analytics.internalApiKey', '');
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.internalApiKey) h['x-internal-api-key'] = this.internalApiKey;
    return h;
  }

  async getCategorySpending(userId: string): Promise<CategorySpending[]> {
    try {
      const url = `${this.baseUrl}/internal/analytics/categories?userId=${encodeURIComponent(userId)}`;
      const res = await fetch(url, { headers: this.headers() });
      if (!res.ok) throw new Error(`Analytics service ${res.status}`);
      return (await res.json()) as CategorySpending[];
    } catch (err) {
      this.logger.warn(`Analytics getCategorySpending failed: ${(err as Error).message}`);
      return [];
    }
  }

  async getMonthlyTrends(userId: string): Promise<MonthlyTrend[]> {
    try {
      const url = `${this.baseUrl}/internal/analytics/monthly-trends?userId=${encodeURIComponent(userId)}`;
      const res = await fetch(url, { headers: this.headers() });
      if (!res.ok) throw new Error(`Analytics service ${res.status}`);
      return (await res.json()) as MonthlyTrend[];
    } catch (err) {
      this.logger.warn(`Analytics getMonthlyTrends failed: ${(err as Error).message}`);
      return [];
    }
  }

  async syncTransactions(
    userId: string,
    documentId: string,
    transactions: Array<{
      date: Date;
      description: string;
      amount: number;
      type: 'debit' | 'credit';
      category: string;
      rawMerchant?: string;
    }>,
  ): Promise<void> {
    try {
      const url = `${this.baseUrl}/internal/sync/transactions`;
      const body = JSON.stringify({
        userId,
        documentId,
        transactions: transactions.map((t) => ({
          date: t.date.toISOString(),
          description: t.description,
          amount: t.amount,
          type: t.type,
          category: t.category,
          rawMerchant: t.rawMerchant,
        })),
      });
      const res = await fetch(url, { method: 'POST', headers: this.headers(), body });
      if (!res.ok) throw new Error(`Analytics sync ${res.status}`);
    } catch (err) {
      this.logger.warn(`Analytics sync failed: ${(err as Error).message}`);
    }
  }
}
