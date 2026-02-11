"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatbotService = void 0;
const common_1 = require("@nestjs/common");
const transactions_service_1 = require("../transactions/transactions.service");
const analytics_client_service_1 = require("../analytics-client/analytics-client.service");
let ChatbotService = class ChatbotService {
    transactionsService;
    analyticsClient;
    constructor(transactionsService, analyticsClient) {
        this.transactionsService = transactionsService;
        this.analyticsClient = analyticsClient;
    }
    async getInsight(userId, question) {
        const [summary, categorySpending, monthlyTrends] = await Promise.all([
            this.transactionsService.getSummary(userId),
            this.analyticsClient.getCategorySpending(userId),
            this.analyticsClient.getMonthlyTrends(userId),
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
};
exports.ChatbotService = ChatbotService;
exports.ChatbotService = ChatbotService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [transactions_service_1.TransactionsService,
        analytics_client_service_1.AnalyticsClientService])
], ChatbotService);
//# sourceMappingURL=chatbot.service.js.map