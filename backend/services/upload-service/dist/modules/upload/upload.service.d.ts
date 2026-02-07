import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { DocumentUpload, DocumentUploadDocument } from './schemas/document.schema';
import { TransactionsService } from '../transactions/transactions.service';
import { S3StorageService } from './storage/s3-storage.service';
import { TransactionParserService } from './services/transaction-parser.service';
import { UserDocument } from '../auth/schemas/user.schema';
export declare class UploadService {
    private readonly documentModel;
    private readonly userModel;
    private readonly config;
    private readonly transactionsService;
    private readonly s3Storage;
    private readonly transactionParser;
    private readonly logger;
    private readonly uploadPath;
    private readonly storageProvider;
    private readonly useS3;
    constructor(documentModel: Model<DocumentUploadDocument>, userModel: Model<UserDocument>, config: ConfigService, transactionsService: TransactionsService, s3Storage: S3StorageService, transactionParser: TransactionParserService);
    initiateUpload(userId: string, file: {
        buffer: Buffer;
        originalname: string;
    }, password?: string): Promise<{
        documentId: string;
        status: string;
    }>;
    private processDocument;
    getStatus(userId: string, documentId: string): Promise<{
        status: import("../../common/constants").DocumentProcessingStatus;
        errorMessage: string | undefined;
        transactionCount: number | undefined;
    } | null>;
    listDocuments(userId: string): Promise<(DocumentUpload & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
}
