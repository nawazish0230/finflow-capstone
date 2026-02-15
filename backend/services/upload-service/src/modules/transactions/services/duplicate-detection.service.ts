import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHash } from 'crypto';
import { Transaction, TransactionDocument } from '../schemas/transaction.schema';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingTransactionId?: string;
  existingTransactionDate?: Date;
  hash: string;
}

@Injectable()
export class DuplicateDetectionService {
  private readonly logger = new Logger(DuplicateDetectionService.name);

  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
  ) {}

  /**
   * Generate hash for a transaction based on date, amount, description, and userId
   * Format: hash(date-amount-description-userId)
   */
  generateTransactionHash(
    date: Date,
    amount: number,
    description: string,
    userId: string,
  ): string {
    // Normalize date to YYYY-MM-DD format (ignore time)
    const dateStr = date.toISOString().split('T')[0];
    
    // Normalize amount to 2 decimal places
    const amountStr = amount.toFixed(2);
    
    // Normalize description: trim, lowercase, remove extra spaces
    const normalizedDesc = description
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .substring(0, 200); // Limit length
    
    // Create hash string
    const hashString = `${dateStr}-${amountStr}-${normalizedDesc}-${userId}`;
    
    // Generate SHA-256 hash
    const hash = createHash('sha256').update(hashString).digest('hex');
    
    this.logger.debug(`Generated hash for transaction: ${hash.substring(0, 8)}...`);
    
    return hash;
  }

  /**
   * Check if a transaction is a duplicate
   */
  async checkDuplicate(
    date: Date,
    amount: number,
    description: string,
    userId: string,
  ): Promise<DuplicateCheckResult> {
    const hash = this.generateTransactionHash(date, amount, description, userId);

    // Check if hash exists in database
    const existingTransaction = await this.transactionModel
      .findOne({
        userId,
        transactionHash: hash,
      })
      .lean()
      .exec();

    if (existingTransaction) {
      this.logger.log(
        `Duplicate transaction detected: hash=${hash.substring(0, 8)}..., existingId=${existingTransaction._id}`,
      );
      return {
        isDuplicate: true,
        existingTransactionId: existingTransaction._id.toString(),
        existingTransactionDate: existingTransaction.date,
        hash,
      };
    }

    return {
      isDuplicate: false,
      hash,
    };
  }

  /**
   * Check multiple transactions for duplicates
   * Returns map of transaction index to duplicate result
   */
  async checkDuplicates(
    transactions: Array<{
      date: Date;
      amount: number;
      description: string;
    }>,
    userId: string,
  ): Promise<Map<number, DuplicateCheckResult>> {
    const results = new Map<number, DuplicateCheckResult>();

    // Generate all hashes
    const hashes = transactions.map((t) =>
      this.generateTransactionHash(t.date, t.amount, t.description, userId),
    );

    // Check all hashes in one query
    const existingTransactions = await this.transactionModel
      .find({
        userId,
        transactionHash: { $in: hashes },
      })
      .lean()
      .exec();

    // Create a map of hash to existing transaction
    const hashToTransaction = new Map(
      existingTransactions.map((t) => [
        t.transactionHash as string,
        t,
      ]),
    );

    // Check each transaction
    transactions.forEach((transaction, index) => {
      const hash = hashes[index];
      const existingTransaction = hashToTransaction.get(hash);

      if (existingTransaction) {
        results.set(index, {
          isDuplicate: true,
          existingTransactionId: existingTransaction._id.toString(),
          existingTransactionDate: existingTransaction.date,
          hash,
        });
      } else {
        results.set(index, {
          isDuplicate: false,
          hash,
        });
      }
    });

    return results;
  }

  /**
   * Get duplicate statistics for a user
   */
  async getDuplicateStats(userId: string): Promise<{
    totalTransactions: number;
    uniqueTransactions: number;
    duplicateCount: number;
  }> {
    const totalTransactions = await this.transactionModel.countDocuments({
      userId,
    });

    const uniqueTransactions = await this.transactionModel.distinct(
      'transactionHash',
      { userId },
    );

    return {
      totalTransactions,
      uniqueTransactions: uniqueTransactions.length,
      duplicateCount: totalTransactions - uniqueTransactions.length,
    };
  }
}
