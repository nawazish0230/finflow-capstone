import { Injectable, Logger, Optional } from '@nestjs/common';
// Use pdfjs-dist for password-aware PDF text extraction (Node entrypoint).
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
import type { TransactionCategory } from '../../../common/constants';
import { PDFParse } from 'pdf-parse';
import { GroqCategorizationService } from '../../transactions/services/groq-categorization.service';

export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  category: TransactionCategory;
  rawMerchant?: string;
}

/**
 * Keyword rules for categorizing transactions.
 * Add more keywords to improve categorization accuracy.
 */
const CATEGORY_KEYWORDS: Record<TransactionCategory, string[]> = {
  Food: [
    'restaurant',
    'cafe',
    'coffee',
    'pizza',
    'burger',
    'food',
    'dining',
    'mcdonald',
    'starbucks',
    'subway',
    'domino',
    'zomato',
    'swiggy',
    'uber eats',
    'doordash',
    'grubhub',
    'kfc',
    'wendy',
    'taco bell',
    'chipotle',
    'panera',
    'dunkin',
    'bakery',
    'grocery',
    'supermarket',
    'walmart',
    'costco',
    'kroger',
    'whole foods',
    'trader joe',
  ],
  Travel: [
    'uber',
    'lyft',
    'taxi',
    'cab',
    'airline',
    'flight',
    'hotel',
    'airbnb',
    'booking.com',
    'expedia',
    'train',
    'railway',
    'bus',
    'metro',
    'transit',
    'parking',
    'gas',
    'petrol',
    'fuel',
    'shell',
    'chevron',
    'exxon',
    'bp',
    'car rental',
    'hertz',
    'avis',
    'enterprise',
    'toll',
  ],
  Shopping: [
    'amazon',
    'ebay',
    'walmart',
    'target',
    'best buy',
    'costco',
    'ikea',
    'home depot',
    'lowe',
    'macy',
    'nordstrom',
    'nike',
    'adidas',
    'zara',
    'h&m',
    'gap',
    'old navy',
    'forever 21',
    'apple store',
    'microsoft store',
    'electronics',
    'clothing',
    'apparel',
    'fashion',
    'shop',
    'store',
    'mall',
    'retail',
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
    'verizon',
    'at&t',
    'tmobile',
    't-mobile',
    'sprint',
    'comcast',
    'xfinity',
    'spectrum',
    'cox',
    'utility',
    'utilities',
    'insurance',
    'rent',
    'mortgage',
    'loan',
    'emi',
    'payment',
    'subscription',
    'netflix',
    'spotify',
    'hulu',
    'disney',
    'hbo',
    'prime',
    'membership',
  ],
  Entertainment: [
    'movie',
    'cinema',
    'theater',
    'theatre',
    'concert',
    'ticket',
    'event',
    'game',
    'gaming',
    'playstation',
    'xbox',
    'nintendo',
    'steam',
    'twitch',
    'spotify',
    'apple music',
    'netflix',
    'hulu',
    'disney',
    'hbo',
    'youtube',
    'gym',
    'fitness',
    'sport',
    'club',
    'bar',
    'pub',
    'lounge',
    'party',
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

@Injectable()
export class TransactionParserService {
  private readonly logger = new Logger(TransactionParserService.name);

  constructor(
    @Optional()
    private readonly groqService?: GroqCategorizationService,
  ) {}

  async parsePdf(
    buffer: Buffer,
    password?: string,
  ): Promise<ParsedTransaction[]> {
    let pdfText: string | undefined;
    
    try {
      const parser = new PDFParse({
        data: buffer,
        password,
      });

      const result = await parser.getText();
      pdfText = result.text;

      this.logger.debug(
        `Extracted ${pdfText.length} chars from PDF via pdf-parse`,
      );
      
      // Try regular parsing first
      const transactions = this.parseTransactionsFromText(pdfText);
      
      // If no transactions found and Groq is available, try Groq as fallback
      if (transactions.length === 0 && this.groqService?.isAvailable() && pdfText) {
        this.logger.log(
          'No transactions found with regular parsing, trying Groq LLM fallback',
        );
        
        try {
          const groqTransactions = await this.groqService.parseTransactionsFromTextWithGroq(
            pdfText,
          );
          
          if (groqTransactions && groqTransactions.length > 0) {
            this.logger.log(
              `Groq extracted ${groqTransactions.length} transactions from PDF`,
            );
            
            // Convert Groq transactions to ParsedTransaction format
            return groqTransactions.map((t) => ({
              date: t.date,
              description: t.description,
              amount: t.amount,
              type: t.type,
              category: t.category,
              rawMerchant: t.description.substring(0, 100),
            }));
          }
        } catch (groqError) {
          this.logger.warn('Groq parsing fallback failed', groqError);
        }
      }
      
      return transactions;
    } catch (error: any) {
      // pdf-parse will throw on bad/missing password; you can inspect error.message if needed
      this.logger.error('Failed to parse PDF', error);
      
      // If Groq is available and we have PDF text, try it as last resort fallback
      if (this.groqService?.isAvailable() && pdfText) {
        this.logger.log('Trying Groq LLM as fallback after parsing error');
        try {
          const groqTransactions = await this.groqService.parseTransactionsFromTextWithGroq(
            pdfText,
          );
          
          if (groqTransactions && groqTransactions.length > 0) {
            this.logger.log(
              `Groq extracted ${groqTransactions.length} transactions as fallback`,
            );
            
            return groqTransactions.map((t) => ({
              date: t.date,
              description: t.description,
              amount: t.amount,
              type: t.type,
              category: t.category,
              rawMerchant: t.description.substring(0, 100),
            }));
          }
        } catch (groqError) {
          this.logger.warn('Groq fallback also failed', groqError);
        }
      }
      
      return [];
    }
  }

  /**
   * Parse transactions from extracted text.
   * This uses regex patterns to identify transaction lines.
   * Adjust patterns based on your bank statement format.
   */
  private parseTransactionsFromText(text: string): ParsedTransaction[] {
    const transactions: ParsedTransaction[] = [];
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    // Date pattern: DD/MM/YYYY or MM/DD/YYYY
    const datePattern = /(\d{1,2}\/\d{1,2}\/\d{2,4})/;
    // Amount pattern: number with optional decimal (e.g., 318.0, 857.35)
    const amountPattern = /(\d+\.?\d*)/g;
    // Type indicators: CR (credit), DR (debit)
    const typePattern = /\b(CR|DR|DEBIT|CREDIT)\b/i;

    // console.log({ lines });
    for (const line of lines) {
      // Must start with a date
      const dateMatch = line.match(datePattern);
      if (!dateMatch) continue;

      const dateStr = dateMatch[1];
      const dateIndex = dateMatch.index ?? 0;

      // Find all amounts in the line
      const amounts: Array<{ value: string; index: number }> = [];
      let match;
      while ((match = amountPattern.exec(line)) !== null) {
        amounts.push({ value: match[1], index: match.index ?? 0 });
      }

      if (amounts.length === 0) continue;

      // Find type indicator (CR/DR)
      const typeMatch = line.match(typePattern);
      const typeIndicator = typeMatch ? typeMatch[1].toUpperCase() : null;

      // Determine transaction amount and balance
      // Usually: first amount after date = transaction amount, second = balance
      // But if type is present, amount before type = transaction amount
      let transactionAmountStr: string | null = null;
      let transactionAmountIndex = -1;

      if (typeMatch && typeMatch.index !== undefined) {
        // Find amount immediately before type indicator
        const typeIndex = typeMatch.index;
        const amountBeforeType = amounts
          .filter((a) => a.index < typeIndex)
          .sort((a, b) => b.index - a.index)[0];
        if (amountBeforeType) {
          transactionAmountStr = amountBeforeType.value;
          transactionAmountIndex = amountBeforeType.index;
        }
      }

      // Fallback: use first amount after date
      if (!transactionAmountStr) {
        const amountsAfterDate = amounts.filter(
          (a) => a.index > dateIndex + dateStr.length,
        );
        if (amountsAfterDate.length > 0) {
          transactionAmountStr = amountsAfterDate[0].value;
          transactionAmountIndex = amountsAfterDate[0].index;
        } else if (amounts.length > 0) {
          transactionAmountStr = amounts[0].value;
          transactionAmountIndex = amounts[0].index;
        }
      }

      if (!transactionAmountStr) continue;

      const amount = parseFloat(transactionAmountStr);
      if (isNaN(amount) || amount === 0) continue;

      // Determine type: CR = credit, DR = debit, default = debit
      let type: 'debit' | 'credit' = 'debit';
      if (typeIndicator) {
        type = /CR|CREDIT/i.test(typeIndicator) ? 'credit' : 'debit';
      } else {
        // Fallback: check for negative or common debit keywords
        const isDebit =
          amount < 0 ||
          /\bDR\b/i.test(line) ||
          /\bdebit\b/i.test(line) ||
          /\bwithdraw/i.test(line) ||
          /\bpurchase/i.test(line) ||
          /\bpayment\b/i.test(line);
        const isCredit =
          /\bCR\b/i.test(line) ||
          /\bcredit\b/i.test(line) ||
          /\bdeposit/i.test(line) ||
          /\brefund/i.test(line);
        type = isCredit && !isDebit ? 'credit' : 'debit';
      }

      // Extract description: everything after the last amount (or after type if present)
      let descriptionStartIndex =
        transactionAmountIndex + transactionAmountStr.length;
      if (typeMatch && typeMatch.index !== undefined) {
        descriptionStartIndex = Math.max(
          descriptionStartIndex,
          typeMatch.index + typeMatch[0].length,
        );
      }

      let description = line
        .substring(descriptionStartIndex)
        .trim()
        .replace(/\s+/g, ' ');

      // Remove balance amount if it appears in description (usually second number)
      if (amounts.length > 1) {
        const balanceAmount = amounts.find(
          (a) =>
            a.index > transactionAmountIndex &&
            a.value !== transactionAmountStr,
        );
        if (balanceAmount && description.includes(balanceAmount.value)) {
          description = description.replace(balanceAmount.value, '').trim();
        }
      }

      // Clean up description
      description = description.replace(/^\d+\.?\d*\s*/, '').trim(); // Remove leading balance if still there

      if (!description) {
        // Fallback: use everything except date, amount, type
        description = line
          .replace(dateStr, '')
          .replace(transactionAmountStr, '')
          .replace(typePattern, '')
          .trim()
          .replace(/\s+/g, ' ');
      }

      // Parse date (handle DD/MM/YYYY format)
      const parsedDate = this.parseDate(dateStr);
      if (!parsedDate) continue;

      // Categorize
      const category = this.categorizeTransaction(description);

      transactions.push({
        date: parsedDate,
        description: description.substring(0, 200),
        amount: Math.abs(amount),
        type,
        category,
        rawMerchant: description.substring(0, 100),
      });
    }

    this.logger.log(`Parsed ${transactions.length} transactions from text`);
    return transactions;
  }

  /**
   * Parse date string into Date object.
   * Handles DD/MM/YYYY (common in Indian/UK formats) and MM/DD/YYYY (US format).
   */
  private parseDate(dateStr: string): Date | null {
    try {
      // Try DD/MM/YYYY first (common in Indian bank statements)
      const slashMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (slashMatch) {
        const [, d, m, y] = slashMatch;
        const day = parseInt(d);
        const month = parseInt(m);
        const year = y.length === 2 ? 2000 + parseInt(y) : parseInt(y);

        // Heuristic: if day > 12, it's definitely DD/MM/YYYY
        // Otherwise, try both formats and pick the valid one
        if (day > 12) {
          return new Date(year, month - 1, day);
        }

        // Try DD/MM/YYYY first
        const date1 = new Date(year, month - 1, day);
        // Try MM/DD/YYYY
        const date2 = new Date(year, day - 1, month);

        // Prefer DD/MM/YYYY if both are valid (more common in bank statements)
        if (date1.getDate() === day && date1.getMonth() === month - 1) {
          return date1;
        }
        if (date2.getDate() === month && date2.getMonth() === day - 1) {
          return date2;
        }
        return date1; // fallback
      }

      // Try YYYY-MM-DD
      const dashMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (dashMatch) {
        const [, y, m, d] = dashMatch;
        return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      }

      // Try DD-Mon-YYYY
      const monMatch = dateStr.match(/(\d{1,2})-([A-Za-z]{3})-(\d{2,4})/);
      if (monMatch) {
        const [, day, mon, y] = monMatch;
        const year = y.length === 2 ? 2000 + parseInt(y) : parseInt(y);
        const months: Record<string, number> = {
          jan: 0,
          feb: 1,
          mar: 2,
          apr: 3,
          may: 4,
          jun: 5,
          jul: 6,
          aug: 7,
          sep: 8,
          oct: 9,
          nov: 10,
          dec: 11,
        };
        const monthNum = months[mon.toLowerCase()];
        if (monthNum !== undefined) {
          return new Date(year, monthNum, parseInt(day));
        }
      }

      // Fallback: native parsing
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) return d;

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Categorize transaction based on description keywords.
   */
  categorizeTransaction(description: string): TransactionCategory {
    const lowerDesc = description.toLowerCase();

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (category === 'Others') continue;
      for (const keyword of keywords) {
        if (lowerDesc.includes(keyword.toLowerCase())) {
          return category as TransactionCategory;
        }
      }
    }

    return 'Others';
  }

  /**
   * Bulk categorize transactions (useful for re-categorization).
   */
  categorizeTransactions(
    transactions: Array<{ description: string }>,
  ): TransactionCategory[] {
    return transactions.map((t) => this.categorizeTransaction(t.description));
  }
}
