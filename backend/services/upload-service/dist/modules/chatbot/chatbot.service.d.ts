import { TransactionsService } from '../transactions/transactions.service';
import { AnalyticsClientService } from '../analytics-client/analytics-client.service';
export declare class ChatbotService {
    private readonly transactionsService;
    private readonly analyticsClient;
    constructor(transactionsService: TransactionsService, analyticsClient: AnalyticsClientService);
    getInsight(userId: string, question: string): Promise<{
        answer: string;
    }>;
}
