import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction, TransactionDocument } from './schemas/transaction.schema';
import { TransactionCategory } from '../../common/constants';
import type { TransactionCreatedEvent } from '../../events/transaction-created.event';
import { PAGINATION } from '../../common/constants';
import { ListTransactionsDto } from './dto/list-transactions.dto';
import { KafkaProducerService } from '../../core/kafka/kafka-producer.service';
import { EnhancedCategorizationService } from './services/enhanced-categorization.service';
import { DuplicateDetectionService } from './services/duplicate-detection.service';

export interface TransactionSummary {
  totalDebit: number;
  totalCredit: number;
  totalTransactions: number;
}

export interface EnhancedTransactionInput {
  date: Date;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  rawMerchant?: string;
}

export interface EnhancedTransactionResult {
  transaction: TransactionDocument | null;
  wasDuplicate: boolean;
  categorizationConfidence: 'high' | 'medium' | 'low';
  categorizationReason?: string;
}

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly enhancedCategorization: EnhancedCategorizationService,
    private readonly duplicateDetection: DuplicateDetectionService,
  ) {}

  async createMany(
    userId: string,
    documentId: string,
    transactions: Array<{
      date: Date;
      description: string;
      amount: number;
      type: 'debit' | 'credit';
      category: TransactionCategory;
      rawMerchant?: string;
    }>,
  ): Promise<number> {
    // console.log({ transactions });
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

    const events: TransactionCreatedEvent[] = result.map((doc) => ({
      id: doc._id.toString(),
      userId: doc.userId,
      documentId: doc.documentId,
      date: doc.date.toISOString(),
      description: doc.description,
      amount: doc.amount,
      type: doc.type,
      category: doc.category,
      rawMerchant: doc.rawMerchant ?? null,
    }));

    this.kafkaProducer.publishTransactionsCreated(events).catch(() => {});

    return result.length;
  }

  async getSummary(userId: string): Promise<TransactionSummary> {
    const [summary] = await this.transactionModel.aggregate<{
      totalDebit: number;
      totalCredit: number;
      totalTransactions: number;
    }>([
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
    return (
      summary ?? {
        totalDebit: 0,
        totalCredit: 0,
        totalTransactions: 0,
      }
    );
  }

  async list(
    userId: string,
    dto: ListTransactionsDto,
  ): Promise<{
    items: TransactionDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(
      PAGINATION.DEFAULT_PAGE,
      dto.page ?? PAGINATION.DEFAULT_PAGE,
    );
    const limit = Math.min(
      PAGINATION.MAX_LIMIT,
      dto.limit ?? PAGINATION.DEFAULT_LIMIT,
    );
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { userId };
    if (dto.category) filter.category = dto.category;
    if (dto.type) filter.type = dto.type;
    if (dto.dateFrom || dto.dateTo) {
      filter.date = {};
      if (dto.dateFrom)
        (filter.date as Record<string, Date>).$gte = new Date(dto.dateFrom);
      if (dto.dateTo)
        (filter.date as Record<string, Date>).$lte = new Date(dto.dateTo);
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

    return { items: items as TransactionDocument[], total, page, limit };
  }

  /**
   * NEW: Create transactions with enhanced categorization and duplicate detection
   * This method uses the new enhanced categorization and duplicate detection services
   * without changing the existing createMany behavior
   */
  async createManyWithEnhancedFeatures(
    userId: string,
    documentId: string,
    transactions: EnhancedTransactionInput[],
    options?: {
      skipDuplicates?: boolean; // Skip duplicates instead of inserting them
      recategorize?: boolean; // Use enhanced categorization even if category exists
    },
  ): Promise<{
    created: number;
    duplicates: number;
    results: EnhancedTransactionResult[];
  }> {
    const results: EnhancedTransactionResult[] = [];
    const transactionsToInsert: Array<{
      userId: string;
      documentId: string;
      date: Date;
      description: string;
      amount: number;
      type: 'debit' | 'credit';
      category: TransactionCategory;
      rawMerchant?: string;
      transactionHash: string;
    }> = [];

    let duplicateCount = 0;

    // Check duplicates for all transactions
    const duplicateResults = await this.duplicateDetection.checkDuplicates(
      transactions,
      userId,
    );

    // Process each transaction
    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i];
      const duplicateResult = duplicateResults.get(i);

      if (!duplicateResult) {
        continue; // Should not happen, but safety check
      }

      // Check if duplicate
      if (duplicateResult.isDuplicate) {
        duplicateCount++;
        this.logger.log(
          `Duplicate transaction detected for user ${userId}: ${transaction.description.substring(0, 50)}...`,
        );

        if (options?.skipDuplicates) {
          // Skip this transaction - fetch existing transaction for result
          const existingTransaction = await this.transactionModel
            .findById(duplicateResult.existingTransactionId)
            .exec();
          results.push({
            transaction: existingTransaction,
            wasDuplicate: true,
            categorizationConfidence: 'low',
            categorizationReason: 'Duplicate transaction skipped',
          });
          continue;
        }
        // If not skipping, continue to insert (user might want to process anyway)
      }

      // Enhanced categorization (with Groq fallback)
      const categorizationResult =
        await this.enhancedCategorization.categorizeTransactionEnhanced(
          transaction.description,
          transaction.amount,
          transaction.date,
        );

      // Generate hash
      const hash = duplicateResult.hash;

      // Prepare transaction document
      transactionsToInsert.push({
        userId,
        documentId,
        date: transaction.date,
        description: transaction.description,
        amount: transaction.amount,
        type: transaction.type,
        category: categorizationResult.category,
        rawMerchant: transaction.rawMerchant,
        transactionHash: hash,
      });

      // Store index for later population
      const insertIndex = transactionsToInsert.length - 1;
      results.push({
        transaction: null, // Will be populated after insert
        wasDuplicate: duplicateResult.isDuplicate,
        categorizationConfidence: categorizationResult.confidence,
        categorizationReason: categorizationResult.reason,
      });
    }

    // Insert transactions
    if (transactionsToInsert.length > 0) {
      const insertedDocs =
        await this.transactionModel.insertMany(transactionsToInsert);

      // Populate results with inserted documents
      let resultIndex = 0;
      insertedDocs.forEach((doc) => {
        // Find next result that doesn't have a transaction (skipped duplicates already have null)
        while (
          resultIndex < results.length &&
          results[resultIndex].transaction !== null
        ) {
          resultIndex++;
        }
        if (resultIndex < results.length) {
          results[resultIndex].transaction = doc;
          resultIndex++;
        }
      });

      // Publish Kafka events
      const events: TransactionCreatedEvent[] = insertedDocs.map((doc) => ({
        id: doc._id.toString(),
        userId: doc.userId,
        documentId: doc.documentId,
        date: doc.date.toISOString(),
        description: doc.description,
        amount: doc.amount,
        type: doc.type,
        category: doc.category,
        rawMerchant: doc.rawMerchant ?? null,
      }));

      this.kafkaProducer.publishTransactionsCreated(events).catch(() => {});

      this.logger.log(
        `Created ${insertedDocs.length} transactions with enhanced features (${duplicateCount} duplicates detected)`,
      );
    }

    return {
      created: transactionsToInsert.length,
      duplicates: duplicateCount,
      results,
    };
  }

  /**
   * NEW: Re-categorize existing transactions using enhanced categorization
   */
  async recategorizeTransactions(
    userId: string,
    transactionIds?: string[],
  ): Promise<{
    updated: number;
    unchanged: number;
  }> {
    const filter: Record<string, unknown> = { userId };
    if (transactionIds && transactionIds.length > 0) {
      filter._id = { $in: transactionIds };
    }

    const transactions = await this.transactionModel.find(filter).exec();

    let updated = 0;
    let unchanged = 0;

    for (const transaction of transactions) {
      const newCategorization =
        await this.enhancedCategorization.categorizeTransactionEnhanced(
          transaction.description,
          transaction.amount,
          transaction.date,
        );

      if (transaction.category !== newCategorization.category) {
        transaction.category = newCategorization.category;
        await transaction.save();
        updated++;
      } else {
        unchanged++;
      }
    }

    this.logger.log(
      `Recategorized transactions: ${updated} updated, ${unchanged} unchanged`,
    );

    return { updated, unchanged };
  }

  /**
   * NEW: Get duplicate information for a transaction
   */
  async getDuplicateInfo(
    userId: string,
    date: Date,
    amount: number,
    description: string,
  ) {
    return this.duplicateDetection.checkDuplicate(
      date,
      amount,
      description,
      userId,
    );
  }
}
