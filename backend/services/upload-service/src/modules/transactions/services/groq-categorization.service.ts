import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import type { TransactionCategory } from '../../../common/constants';

export interface GroqCategorizationResult {
  category: TransactionCategory;
  confidence: 'high' | 'medium' | 'low';
  reason?: string;
  extractedDetails?: {
    merchantName?: string;
    transactionType?: string;
    purpose?: string;
  };
}

@Injectable()
export class GroqCategorizationService {
  private readonly logger = new Logger(GroqCategorizationService.name);
  private client: Groq | null = null;
  private readonly enabled: boolean;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    this.enabled = !!apiKey;

    if (this.enabled) {
      try {
        this.client = new Groq({
          apiKey,
        });
        this.logger.log('Groq categorization service initialized');
      } catch (error) {
        this.logger.warn('Failed to initialize Groq client', error);
        this.enabled = false;
      }
    } else {
      this.logger.warn('Groq API key not found, categorization fallback disabled');
    }
  }

  /**
   * Use Groq LLM to categorize a transaction as fallback
   * This is called when regular categorization has low confidence
   */
  async categorizeWithGroq(
    description: string,
    amount: number,
    date?: Date,
  ): Promise<GroqCategorizationResult | null> {
    if (!this.enabled || !this.client) {
      this.logger.debug('Groq service not available, skipping LLM categorization');
      return null;
    }

    try {
      const prompt = this.buildCategorizationPrompt(description, amount, date);

      const completion = await this.client.chat.completions.create({
        model: 'llama-3.3-70b-versatile', // Best quality model (updated from deprecated llama-3.1-70b-versatile)
        messages: [
          {
            role: 'system',
            content: `You are a financial transaction categorization assistant. 
Analyze transaction descriptions and categorize them accurately into one of these categories:
- Food: Restaurants, cafes, food delivery, groceries
- Travel: Transportation, hotels, flights, fuel, parking
- Shopping: Online/offline purchases, retail stores
- Bills: Utilities, subscriptions, insurance, rent, loans
- Entertainment: Movies, games, streaming services, gym, events
- OnlinePayments: Payment apps like PhonePe, GooglePay, Paytm
- Others: Everything else that doesn't fit above categories

Return ONLY a valid JSON object with this exact structure:
{
  "category": "Food|Travel|Shopping|Bills|Entertainment|OnlinePayments|Others",
  "confidence": "high|medium|low",
  "reason": "Brief explanation",
  "extractedDetails": {
    "merchantName": "extracted merchant name if available",
    "transactionType": "UPI|Card|NEFT|IMPS|etc",
    "purpose": "brief purpose if identifiable"
  }
}`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent categorization
        max_tokens: 200,
        response_format: { type: 'json_object' },
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        this.logger.warn('Empty response from Groq');
        return null;
      }

      const parsed = JSON.parse(responseText) as {
        category: string;
        confidence: string;
        reason?: string;
        extractedDetails?: {
          merchantName?: string;
          transactionType?: string;
          purpose?: string;
        };
      };

      // Validate category
      const validCategories: TransactionCategory[] = [
        'Food',
        'Travel',
        'Shopping',
        'Bills',
        'Entertainment',
        'OnlinePayments',
        'Others',
      ];

      const category = validCategories.includes(parsed.category as TransactionCategory)
        ? (parsed.category as TransactionCategory)
        : 'Others';

      const confidence = ['high', 'medium', 'low'].includes(parsed.confidence)
        ? (parsed.confidence as 'high' | 'medium' | 'low')
        : 'medium';

      this.logger.debug(
        `Groq categorized transaction: ${description.substring(0, 50)}... → ${category} (${confidence})`,
      );

      return {
        category,
        confidence,
        reason: parsed.reason,
        extractedDetails: parsed.extractedDetails,
      };
    } catch (error) {
      this.logger.error('Failed to categorize with Groq', error);
      return null;
    }
  }

  /**
   * Use Groq to parse and extract transactions from PDF text
   * This is a fallback when regular parsing fails
   */
  async parseTransactionsFromTextWithGroq(
    pdfText: string,
  ): Promise<
    Array<{
      date: Date;
      description: string;
      amount: number;
      type: 'debit' | 'credit';
      category: TransactionCategory;
    }> | null
  > {
    if (!this.enabled || !this.client) {
      this.logger.debug('Groq service not available, skipping LLM parsing');
      return null;
    }

    try {
      const prompt = `Extract all financial transactions from the following bank statement text.
Return ONLY a valid JSON object with a "transactions" array containing transactions in this exact structure:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "transaction description",
      "amount": 123.45,
      "type": "debit|credit",
      "category": "Food|Travel|Shopping|Bills|Entertainment|OnlinePayments|Others"
    }
  ]
}

Bank Statement Text:
${pdfText.substring(0, 8000)}`; // Limit text to avoid token limits

      const completion = await this.client.chat.completions.create({
        model: 'llama-3.3-70b-versatile', // Updated from deprecated llama-3.1-70b-versatile
        messages: [
          {
            role: 'system',
            content: `You are a bank statement parser. Extract all transactions accurately.
Return a JSON object with a "transactions" array.
For dates, use YYYY-MM-DD format.
For amounts, use numbers only (no currency symbols).
For type, use "debit" for money going out, "credit" for money coming in.
For category, choose the most appropriate category based on the description.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2, // Very low temperature for accurate extraction
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        return null;
      }

      const parsed = JSON.parse(responseText) as {
        transactions?: Array<{
          date: string;
          description: string;
          amount: number;
          type: string;
          category: string;
        }>;
      };

      if (!parsed.transactions || !Array.isArray(parsed.transactions)) {
        this.logger.warn('Invalid transaction format from Groq');
        return null;
      }

      const validCategories: TransactionCategory[] = [
        'Food',
        'Travel',
        'Shopping',
        'Bills',
        'Entertainment',
        'OnlinePayments',
        'Others',
      ];

      const transactions = parsed.transactions
        .map((t) => {
          try {
            const date = new Date(t.date);
            if (isNaN(date.getTime())) {
              return null;
            }

            const type: 'debit' | 'credit' = t.type.toLowerCase() === 'credit' ? 'credit' : 'debit';
            const category = validCategories.includes(t.category as TransactionCategory)
              ? (t.category as TransactionCategory)
              : 'Others';

            return {
              date,
              description: t.description.trim(),
              amount: Math.abs(t.amount),
              type,
              category,
            };
          } catch (error) {
            this.logger.warn('Failed to parse transaction from Groq response', error);
            return null;
          }
        })
        .filter((t): t is NonNullable<typeof t> => t !== null);

      this.logger.log(`Groq extracted ${transactions.length} transactions from PDF text`);

      return transactions.length > 0 ? transactions : null;
    } catch (error) {
      this.logger.error('Failed to parse transactions with Groq', error);
      return null;
    }
  }

  /**
   * Build prompt for categorization
   */
  private buildCategorizationPrompt(
    description: string,
    amount: number,
    date?: Date,
  ): string {
    let prompt = `Categorize this financial transaction:

Description: ${description}
Amount: ₹${amount.toFixed(2)}`;

    if (date) {
      prompt += `\nDate: ${date.toISOString().split('T')[0]}`;
    }

    prompt += `\n\nAnalyze the transaction description and amount to determine the most appropriate category.
Consider:
- UPI transactions (P2V, P2M patterns)
- Merchant names and payment apps
- Amount patterns (small amounts often food/travel, round amounts often transfers)
- Transaction type indicators

Return the categorization result as JSON.`;

    return prompt;
  }

  /**
   * Check if Groq service is available
   */
  isAvailable(): boolean {
    return this.enabled && this.client !== null;
  }
}
