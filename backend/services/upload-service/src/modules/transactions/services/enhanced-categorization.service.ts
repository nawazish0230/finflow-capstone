import { Injectable, Logger, Optional } from '@nestjs/common';
import type { TransactionCategory } from '../../../common/constants';
import { GroqCategorizationService } from './groq-categorization.service';

export interface UPIParsedInfo {
  beneficiaryId?: string; // e.g., "ybl", "okaxis"
  beneficiaryName?: string; // e.g., "SONU SRIVASTA", "PhonePe", "GOOGLEPAY"
  transactionType?: 'P2V' | 'P2M' | 'P2P'; // Person to Vendor, Merchant, Person
  isUPI: boolean;
}

export interface CategorizationResult {
  category: TransactionCategory;
  confidence: 'high' | 'medium' | 'low';
  reason?: string;
}

@Injectable()
export class EnhancedCategorizationService {
  private readonly logger = new Logger(EnhancedCategorizationService.name);

  constructor(
    @Optional()
    private readonly groqService?: GroqCategorizationService,
  ) {}

  /**
   * Enhanced categorization for UPI transactions with better parsing
   * Uses Groq LLM as fallback when confidence is low
   */
  async categorizeTransactionEnhanced(
    description: string,
    amount: number,
    date?: Date,
  ): Promise<CategorizationResult> {
    const upiInfo = this.parseUPIString(description);
    const lowerDesc = description.toLowerCase().trim();

    let result: CategorizationResult;

    // If it's a UPI transaction, use enhanced logic
    if (upiInfo.isUPI) {
      result = this.categorizeUPITransaction(upiInfo, amount, lowerDesc);
    } else {
      // Fallback to keyword-based categorization for non-UPI transactions
      result = this.categorizeByKeywords(lowerDesc, amount);
    }

    // If confidence is low and Groq is available, use it as fallback
    if (this.groqService?.isAvailable()) {
      this.logger.debug(
        `Low confidence categorization, trying Groq fallback for: ${description.substring(0, 50)}...`,
      );

      try {
        const groqResult = await this.groqService.categorizeWithGroq(
          description,
          amount,
          date,
        );

        if (groqResult && groqResult.confidence !== 'low') {
          this.logger.log(
            `Groq improved categorization: ${result.category} → ${groqResult.category} (${groqResult.confidence})`,
          );
          return {
            category: groqResult.category,
            confidence: groqResult.confidence,
            reason: `Groq LLM: ${groqResult.reason || 'Improved categorization'}`,
          };
        }
      } catch (error) {
        this.logger.warn('Groq fallback failed, using original categorization', error);
      }
    }

    return result;
  }

  /**
   * Parse UPI string to extract beneficiary information
   * Format: UPI/005722738967/P2V/7250963600@ybl/SONU SRIVASTA
   * Format: UPI/005030978101/P2M/BILLDESKPP@ybl/PhonePe
   */
  parseUPIString(description: string): UPIParsedInfo {
    const upiPattern = /UPI\/([^\/]+)\/(P2[VMP])\/([^\/]+)@([^\/]+)\/(.+)/i;
    const match = description.match(upiPattern);

    if (!match) {
      // Check if it's a UPI transaction but with different format
      if (description.toUpperCase().includes('UPI')) {
        return {
          isUPI: true,
          beneficiaryName: this.extractBeneficiaryNameFallback(description),
          transactionType: this.extractTransactionTypeFallback(description),
        };
      }
      return { isUPI: false };
    }

    const [, , transactionType, , beneficiaryId, beneficiaryName] = match;

    return {
      isUPI: true,
      beneficiaryId: beneficiaryId.toLowerCase(),
      beneficiaryName: beneficiaryName.trim(),
      transactionType: transactionType as 'P2V' | 'P2M' | 'P2P',
    };
  }

  /**
   * Extract beneficiary name from UPI string (fallback method)
   */
  private extractBeneficiaryNameFallback(description: string): string | undefined {
    // Try to find name after @ symbol or after last /
    const parts = description.split('/');
    if (parts.length > 0) {
      const lastPart = parts[parts.length - 1].trim();
      if (lastPart && lastPart.length > 2) {
        return lastPart;
      }
    }

    // Try to extract after @
    const atIndex = description.indexOf('@');
    if (atIndex > -1) {
      const afterAt = description.substring(atIndex + 1);
      const slashIndex = afterAt.indexOf('/');
      if (slashIndex > -1) {
        return afterAt.substring(slashIndex + 1).trim();
      }
    }

    return undefined;
  }

  /**
   * Extract transaction type from UPI string (fallback)
   */
  private extractTransactionTypeFallback(description: string): 'P2V' | 'P2M' | 'P2P' | undefined {
    const p2vMatch = description.match(/P2V/i);
    if (p2vMatch) return 'P2V';

    const p2mMatch = description.match(/P2M/i);
    if (p2mMatch) return 'P2M';

    const p2pMatch = description.match(/P2P/i);
    if (p2pMatch) return 'P2P';

    return undefined;
  }

  /**
   * Categorize UPI transaction using enhanced logic
   */
  private categorizeUPITransaction(
    upiInfo: UPIParsedInfo,
    amount: number,
    lowerDesc: string,
  ): CategorizationResult {
    const beneficiaryName = upiInfo.beneficiaryName?.toLowerCase() || '';
    const beneficiaryId = upiInfo.beneficiaryId || '';

    // Check for known payment apps
    const paymentApps = ['phonepe', 'phon', 'googlepay', 'goog', 'paytm', 'amazonpay'];
    const isPaymentApp = paymentApps.some((app) =>
      beneficiaryName.includes(app) || lowerDesc.includes(app),
    );

    if (isPaymentApp) {
      return {
        category: 'OnlinePayments',
        confidence: 'high',
        reason: 'Detected payment app',
      };
    }

    // Check transaction type
    if (upiInfo.transactionType === 'P2V') {
      // Person to Vendor - likely personal transfer or small purchase
      if (amount < 500) {
        return {
          category: 'Food',
          confidence: 'medium',
          reason: 'P2V transaction with small amount (< ₹500)',
        };
      }
      if (this.isRoundAmount(amount)) {
        return {
          category: 'Others',
          confidence: 'medium',
          reason: 'P2V transaction with round amount (likely transfer)',
        };
      }
      return {
        category: 'Shopping',
        confidence: 'low',
        reason: 'P2V transaction',
      };
    }

    if (upiInfo.transactionType === 'P2M') {
      // Person to Merchant - likely merchant payment
      if (this.isExactSubscriptionAmount(amount)) {
        return {
          category: 'Bills',
          confidence: 'high',
          reason: 'P2M transaction with subscription-like amount',
        };
      }

      // Check for bill payment keywords
      const billKeywords = ['billdesk', 'bill', 'payment', 'recharge'];
      const hasBillKeyword = billKeywords.some((keyword) =>
        beneficiaryName.includes(keyword) || lowerDesc.includes(keyword),
      );

      if (hasBillKeyword) {
        return {
          category: 'Bills',
          confidence: 'high',
          reason: 'P2M transaction with bill payment keyword',
        };
      }

      if (amount < 500) {
        return {
          category: 'Food',
          confidence: 'medium',
          reason: 'P2M transaction with small amount (< ₹500)',
        };
      }

      return {
        category: 'Shopping',
        confidence: 'medium',
        reason: 'P2M transaction',
      };
    }

    // Amount-based heuristics
    if (amount < 500) {
      return {
        category: 'Food',
        confidence: 'low',
        reason: 'Small amount (< ₹500)',
      };
    }

    if (this.isRoundAmount(amount)) {
      return {
        category: 'Others',
        confidence: 'low',
        reason: 'Round amount (likely transfer/withdrawal)',
      };
    }

    if (this.isExactSubscriptionAmount(amount)) {
      return {
        category: 'Bills',
        confidence: 'medium',
        reason: 'Exact subscription-like amount',
      };
    }

    // Check beneficiary name for keywords
    const categoryByBeneficiary = this.categorizeByBeneficiaryName(beneficiaryName);
    if (categoryByBeneficiary) {
      return {
        category: categoryByBeneficiary,
        confidence: 'medium',
        reason: 'Matched beneficiary name keywords',
      };
    }

    // Default to Uncategorized (Others)
    return {
      category: 'Others',
      confidence: 'low',
      reason: 'Unable to categorize UPI transaction',
    };
  }

  /**
   * Check if amount is round (e.g., 1000, 2000, 5000)
   */
  private isRoundAmount(amount: number): boolean {
    return amount % 100 === 0 && amount >= 100;
  }

  /**
   * Check if amount matches common subscription amounts (e.g., 199, 299, 499, 999)
   */
  private isExactSubscriptionAmount(amount: number): boolean {
    const subscriptionAmounts = [
      99, 149, 199, 249, 299, 349, 399, 449, 499, 599, 699, 799, 899, 999,
    ];
    return subscriptionAmounts.includes(Math.round(amount));
  }

  /**
   * Categorize by beneficiary name keywords
   */
  private categorizeByBeneficiaryName(beneficiaryName: string): TransactionCategory | null {
    const lowerName = beneficiaryName.toLowerCase();

    // Food keywords
    const foodKeywords = [
      'restaurant',
      'cafe',
      'food',
      'zomato',
      'swiggy',
      'uber eats',
      'pizza',
      'burger',
    ];
    if (foodKeywords.some((kw) => lowerName.includes(kw))) {
      return 'Food';
    }

    // Travel keywords
    const travelKeywords = ['uber', 'ola', 'taxi', 'cab', 'train', 'bus', 'metro'];
    if (travelKeywords.some((kw) => lowerName.includes(kw))) {
      return 'Travel';
    }

    // Shopping keywords
    const shoppingKeywords = ['amazon', 'flipkart', 'myntra', 'shop', 'store'];
    if (shoppingKeywords.some((kw) => lowerName.includes(kw))) {
      return 'Shopping';
    }

    // Bills keywords
    const billsKeywords = [
      'bill',
      'recharge',
      'electricity',
      'water',
      'gas',
      'internet',
      'phone',
      'mobile',
    ];
    if (billsKeywords.some((kw) => lowerName.includes(kw))) {
      return 'Bills';
    }

    // Entertainment keywords
    const entertainmentKeywords = [
      'movie',
      'cinema',
      'netflix',
      'spotify',
      'prime',
      'disney',
    ];
    if (entertainmentKeywords.some((kw) => lowerName.includes(kw))) {
      return 'Entertainment';
    }

    return null;
  }

  /**
   * Fallback to keyword-based categorization
   */
  private categorizeByKeywords(
    lowerDesc: string,
    amount: number,
  ): CategorizationResult {
    // Use existing keyword matching logic
    const CATEGORY_KEYWORDS: Record<TransactionCategory, string[]> = {
      Food: [
        'restaurant',
        'cafe',
        'coffee',
        'pizza',
        'burger',
        'food',
        'dining',
        'zomato',
        'swiggy',
        'uber eats',
        'grocery',
        'supermarket',
      ],
      Travel: [
        'uber',
        'lyft',
        'taxi',
        'cab',
        'airline',
        'flight',
        'hotel',
        'train',
        'bus',
        'metro',
        'parking',
        'gas',
        'petrol',
        'fuel',
      ],
      Shopping: [
        'amazon',
        'ebay',
        'walmart',
        'target',
        'best buy',
        'shop',
        'store',
        'purchase',
        'order',
      ],
      Bills: [
        'electric',
        'electricity',
        'water',
        'gas bill',
        'internet',
        'wifi',
        'phone',
        'mobile',
        'utility',
        'insurance',
        'rent',
        'mortgage',
        'loan',
        'emi',
        'subscription',
        'netflix',
        'spotify',
        'hulu',
        'disney',
        'prime',
      ],
      Entertainment: [
        'movie',
        'cinema',
        'theater',
        'concert',
        'ticket',
        'game',
        'gaming',
        'spotify',
        'netflix',
        'youtube',
        'gym',
        'fitness',
      ],
      OnlinePayments: [
        'phonepe',
        'paytm',
        'googlepay',
        'goog',
        'phon',
        'google pay',
        'amazon pay',
      ],
      Others: [],
    };

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (category === 'Others') continue;
      for (const keyword of keywords) {
        if (lowerDesc.includes(keyword.toLowerCase())) {
          return {
            category: category as TransactionCategory,
            confidence: 'high',
            reason: `Matched keyword: ${keyword}`,
          };
        }
      }
    }

    // Amount-based fallback
    if (amount < 500) {
      return {
        category: 'Food',
        confidence: 'low',
        reason: 'Small amount (< ₹500)',
      };
    }

    return {
      category: 'Others',
      confidence: 'low',
      reason: 'No matching keywords found',
    };
  }
}
