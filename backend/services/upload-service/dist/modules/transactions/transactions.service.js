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
exports.TransactionsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const transaction_schema_1 = require("./schemas/transaction.schema");
const constants_1 = require("../../common/constants");
let TransactionsService = class TransactionsService {
    transactionModel;
    constructor(transactionModel) {
        this.transactionModel = transactionModel;
    }
    async createMany(userId, documentId, transactions) {
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
    async getSummary(userId) {
        const [summary] = await this.transactionModel.aggregate([
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
        return (summary ?? {
            totalDebit: 0,
            totalCredit: 0,
            totalTransactions: 0,
        });
    }
    async list(userId, dto) {
        const page = Math.max(constants_1.PAGINATION.DEFAULT_PAGE, dto.page ?? constants_1.PAGINATION.DEFAULT_PAGE);
        const limit = Math.min(constants_1.PAGINATION.MAX_LIMIT, dto.limit ?? constants_1.PAGINATION.DEFAULT_LIMIT);
        const skip = (page - 1) * limit;
        const filter = { userId };
        if (dto.category)
            filter.category = dto.category;
        if (dto.type)
            filter.type = dto.type;
        if (dto.dateFrom || dto.dateTo) {
            filter.date = {};
            if (dto.dateFrom)
                filter.date.$gte = new Date(dto.dateFrom);
            if (dto.dateTo)
                filter.date.$lte = new Date(dto.dateTo);
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
        return { items: items, total, page, limit };
    }
};
exports.TransactionsService = TransactionsService;
exports.TransactionsService = TransactionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(transaction_schema_1.Transaction.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], TransactionsService);
//# sourceMappingURL=transactions.service.js.map