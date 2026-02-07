"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var UploadService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const config_1 = require("@nestjs/config");
const uuid_1 = require("uuid");
const path = __importStar(require("path"));
const document_schema_1 = require("./schemas/document.schema");
const constants_1 = require("../../common/constants");
const transactions_service_1 = require("../transactions/transactions.service");
const s3_storage_service_1 = require("./storage/s3-storage.service");
const transaction_parser_service_1 = require("./services/transaction-parser.service");
const user_schema_1 = require("../auth/schemas/user.schema");
let UploadService = UploadService_1 = class UploadService {
    documentModel;
    userModel;
    config;
    transactionsService;
    s3Storage;
    transactionParser;
    logger = new common_1.Logger(UploadService_1.name);
    uploadPath;
    storageProvider;
    useS3;
    constructor(documentModel, userModel, config, transactionsService, s3Storage, transactionParser) {
        this.documentModel = documentModel;
        this.userModel = userModel;
        this.config = config;
        this.transactionsService = transactionsService;
        this.s3Storage = s3Storage;
        this.transactionParser = transactionParser;
        this.uploadPath = this.config.get('storage.localPath', './uploads');
        this.storageProvider = this.config.get('storage.provider', 'local');
        this.useS3 = this.storageProvider === 's3' && this.s3Storage.isConfigured();
    }
    async initiateUpload(userId, file, password) {
        const filename = file.originalname || 'statement.pdf';
        const ext = path.extname(filename).toLowerCase();
        if (ext !== '.pdf')
            throw new common_1.BadRequestException('Only PDF files are allowed');
        const documentId = (0, uuid_1.v4)();
        const storageKey = `${userId}/${documentId}${ext}`;
        await this.documentModel.create({
            documentId,
            userId,
            filename,
            storageKey,
            password: password ?? null,
            status: constants_1.DOCUMENT_PROCESSING_STATUS.UPLOADED,
        });
        if (!this.useS3) {
            throw new common_1.BadRequestException('Only S3 storage is supported');
        }
        await this.s3Storage.put(storageKey, file.buffer, 'application/pdf');
        setImmediate(() => this.processDocument(userId, documentId, storageKey, password).catch(() => { }));
        await this.documentModel.updateOne({ userId, documentId }, { status: constants_1.DOCUMENT_PROCESSING_STATUS.COMPLETED });
        return { documentId, status: constants_1.DOCUMENT_PROCESSING_STATUS.COMPLETED };
    }
    async processDocument(userId, documentId, storageKey, password) {
        try {
            this.logger.log(`Processing document ${documentId} for user ${userId} with password ${password}`);
            let pdfBuffer;
            if (!this.useS3) {
                throw new common_1.BadRequestException('Only S3 storage is supported');
            }
            pdfBuffer = await this.s3Storage.get(storageKey);
            const parsedTransactions = await this.transactionParser.parsePdf(pdfBuffer, password);
            this.logger.log(`Parsed ${parsedTransactions.length} transactions from PDF`);
            const count = await this.transactionsService.createMany(userId, documentId, parsedTransactions);
            await this.documentModel.updateOne({ userId, storageKey }, {
                status: constants_1.DOCUMENT_PROCESSING_STATUS.COMPLETED,
                transactionCount: count,
            });
            this.logger.log(`Document ${documentId} processed successfully with ${count} transactions`);
        }
        catch (err) {
            this.logger.error(`Failed to process document ${documentId}`, err.stack);
        }
    }
    async getStatus(userId, documentId) {
        const doc = await this.documentModel
            .findOne({ userId, documentId })
            .lean()
            .exec();
        if (!doc)
            return null;
        return {
            status: doc.status,
            errorMessage: doc.errorMessage,
            transactionCount: doc.transactionCount,
        };
    }
    async listDocuments(userId) {
        return this.documentModel
            .find({ userId })
            .sort({ createdAt: -1 })
            .lean()
            .exec();
    }
};
exports.UploadService = UploadService;
exports.UploadService = UploadService = UploadService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(document_schema_1.DocumentUpload.name)),
    __param(1, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        config_1.ConfigService,
        transactions_service_1.TransactionsService,
        s3_storage_service_1.S3StorageService,
        transaction_parser_service_1.TransactionParserService])
], UploadService);
//# sourceMappingURL=upload.service.js.map