import { TransactionsService } from '../transactions/transactions.service';
import { AnalyticsService } from '../analytics/analytics.service';
export declare class ChatbotService {
    private readonly transactionsService;
    private readonly analyticsService;
    constructor(transactionsService: TransactionsService, analyticsService: AnalyticsService);
    getInsight(userId: string, question: string): Promise<{
        answer: string;
    }>;
}
