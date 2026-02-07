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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const transaction_schema_1 = require("../transactions/schemas/transaction.schema");
let AnalyticsService = class AnalyticsService {
    transactionModel;
    constructor(transactionModel) {
        this.transactionModel = transactionModel;
    }
    async getCategorySpending(userId) {
        const result = await this.transactionModel.aggregate([
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
    async getMonthlyTrends(userId) {
        const byMonth = await this.transactionModel.aggregate([
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
        const variance = totals.length > 1 ? totals.reduce((s, t) => s + (t - mean) ** 2, 0) / (totals.length - 1) : 0;
        const std = Math.sqrt(variance);
        const threshold = mean + 2 * std;
        const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return byMonth.map((m) => {
            const categorySums = (m.categories ?? []).reduce((acc, c) => {
                acc[c.category] = (acc[c.category] ?? 0) + c.amount;
                return acc;
            }, {});
            const entries = Object.entries(categorySums);
            const top = entries.sort((a, b) => b[1] - a[1])[0];
            const topCategoryAmount = typeof top?.[1] === 'number' ? top[1] : 0;
            return {
                month: monthNames[m._id.month],
                year: m._id.year,
                totalSpending: m.total,
                topCategory: (top?.[0] ?? 'Others'),
                topCategoryAmount,
                isAnomaly: m.total > threshold,
            };
        });
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(transaction_schema_1.Transaction.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map