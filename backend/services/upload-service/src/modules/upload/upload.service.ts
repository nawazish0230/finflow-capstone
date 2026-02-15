import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import {
  DocumentUpload,
  DocumentUploadDocument,
} from './schemas/document.schema';
import { DOCUMENT_PROCESSING_STATUS } from '../../common/constants';
import { TransactionsService } from '../transactions/transactions.service';
import { S3StorageService } from './storage/s3-storage.service';
import { TransactionParserService } from './services/transaction-parser.service';
@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly uploadPath: string;
  private readonly storageProvider: string;
  private readonly useS3: boolean;

  constructor(
    @InjectModel(DocumentUpload.name)
    private readonly documentModel: Model<DocumentUploadDocument>,
    private readonly config: ConfigService,
    private readonly transactionsService: TransactionsService,
    private readonly s3Storage: S3StorageService,
    private readonly transactionParser: TransactionParserService,
  ) {
    this.uploadPath = this.config.get<string>('storage.localPath', './uploads');
    this.storageProvider = this.config.get<string>('storage.provider', 'local');
    this.useS3 = this.storageProvider === 's3' && this.s3Storage.isConfigured();
    // if (!this.useS3 && !fs.existsSync(this.uploadPath)) {
    //   fs.mkdirSync(this.uploadPath, { recursive: true });
    // }
  }

  /**
   * Single-step upload: accept file, create document, store (S3 or local), start processing.
   */
  async initiateUpload(
    userId: string,
    file: { buffer: Buffer; originalname: string },
    password?: string,
  ): Promise<{ documentId: string; status: string }> {
    const filename = file.originalname || 'statement.pdf';

    // TODO: this need to be uncommented keping it for testing purposes
    // const doc = await this.documentModel
    //   .findOne({ userId, filename })
    //   .lean()
    //   .exec();
    // if (doc) {
    //   throw new BadRequestException('Document already exists');
    // }

    const ext = path.extname(filename).toLowerCase();
    if (ext !== '.pdf')
      throw new BadRequestException('Only PDF files are allowed');

    const documentId = uuidv4();
    const storageKey = `${userId}/${documentId}${ext}`;

    await this.documentModel.create({
      documentId,
      userId,
      filename,
      storageKey,
      password: password ?? null,
      status: DOCUMENT_PROCESSING_STATUS.UPLOADED,
    });

    if (!this.useS3) {
      throw new BadRequestException('Only S3 storage is supported');
    }

    await this.s3Storage.put(storageKey, file.buffer, 'application/pdf');

    // TODO: improvement we can use KAFKA to process this in background
    // setImmediate(() =>
    //   this.processDocument(userId, documentId, storageKey, password).catch(
    //     () => {},
    //   ),
    // );
    await this.processDocumentWithEnhancedFeatures(
      userId,
      documentId,
      storageKey,
      password,
      {
        skipDuplicates: true,
      },
    );

    await this.documentModel.updateOne(
      { userId, documentId },
      { status: DOCUMENT_PROCESSING_STATUS.COMPLETED },
    );

    return { documentId, status: DOCUMENT_PROCESSING_STATUS.COMPLETED };
  }

  private async processDocument(
    userId: string,
    documentId: string,
    storageKey: string,
    password?: string,
  ): Promise<void> {
    try {
      this.logger.log(
        `Processing document ${documentId} for user ${userId} with password ${password}`,
      );

      // Get PDF buffer
      let pdfBuffer: Buffer;
      if (!this.useS3) {
        throw new BadRequestException('Only S3 storage is supported');
      }
      pdfBuffer = await this.s3Storage.get(storageKey);

      // Parse PDF and extract transactions
      const parsedTransactions = await this.transactionParser.parsePdf(
        pdfBuffer,
        password,
      );
      this.logger.log(
        `Parsed ${parsedTransactions.length} transactions from PDF`,
      );

      // Save transactions to database
      // const count = await this.transactionsService.createMany(
      //   userId,
      //   documentId,
      //   parsedTransactions,
      // );
      const result =
        await this.transactionsService.createManyWithEnhancedFeatures(
          userId,
          documentId,
          parsedTransactions,
          { skipDuplicates: true },
        );

      await this.documentModel.updateOne(
        { userId, storageKey },
        {
          status: DOCUMENT_PROCESSING_STATUS.COMPLETED,
          transactionCount: result.created,
        },
      );

      this.logger.log(
        `Document ${documentId} processed successfully with ${result.created} transactions`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to process document ${documentId}`,
        (err as Error).stack,
      );
    }
  }

  /**
   * NEW: Process document with enhanced categorization and duplicate detection
   * This method uses the new enhanced features without changing existing behavior
   */
  async processDocumentWithEnhancedFeatures(
    userId: string,
    documentId: string,
    storageKey: string,
    password?: string,
    options?: {
      skipDuplicates?: boolean;
    },
  ): Promise<{
    created: number;
    duplicates: number;
    status: string;
  }> {
    try {
      this.logger.log(
        `Processing document ${documentId} with enhanced features for user ${userId}`,
      );

      // Get PDF buffer
      let pdfBuffer: Buffer;
      if (!this.useS3) {
        throw new BadRequestException('Only S3 storage is supported');
      }
      pdfBuffer = await this.s3Storage.get(storageKey);

      // Parse PDF and extract transactions
      const parsedTransactions = await this.transactionParser.parsePdf(
        pdfBuffer,
        password,
      );
      this.logger.log(
        `Parsed ${parsedTransactions.length} transactions from PDF`,
      );

      // Convert to enhanced transaction format
      const enhancedTransactions = parsedTransactions.map((t) => ({
        date: t.date,
        description: t.description,
        amount: t.amount,
        type: t.type,
        rawMerchant: t.rawMerchant,
      }));

      // Save transactions with enhanced features
      const result =
        await this.transactionsService.createManyWithEnhancedFeatures(
          userId,
          documentId,
          enhancedTransactions,
          options,
        );

      await this.documentModel.updateOne(
        { userId, storageKey },
        {
          status: DOCUMENT_PROCESSING_STATUS.COMPLETED,
          transactionCount: result.created,
        },
      );

      this.logger.log(
        `Document ${documentId} processed successfully: ${result.created} created, ${result.duplicates} duplicates`,
      );

      return {
        created: result.created,
        duplicates: result.duplicates,
        status: DOCUMENT_PROCESSING_STATUS.COMPLETED,
      };
    } catch (err) {
      this.logger.error(
        `Failed to process document ${documentId} with enhanced features`,
        (err as Error).stack,
      );
      throw err;
    }
  }

  async getStatus(userId: string, documentId: string) {
    const doc = await this.documentModel
      .findOne({ userId, documentId })
      .lean()
      .exec();
    if (!doc) return null;
    return {
      status: doc.status,
      errorMessage: doc.errorMessage,
      transactionCount: doc.transactionCount,
    };
  }

  async listDocuments(userId: string) {
    return this.documentModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }
}
