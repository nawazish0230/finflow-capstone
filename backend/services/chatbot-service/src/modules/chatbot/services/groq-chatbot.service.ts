import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';

export interface PredefinedQuestion {
  keywords: string[]; // Keywords that trigger this question
  question: string; // The actual question to ask Groq
  context?: string; // Additional context for the question
}

@Injectable()
export class GroqChatbotService {
  private readonly logger = new Logger(GroqChatbotService.name);
  private client: Groq | null = null;
  private readonly enabled: boolean;

  // Predefined questions that Groq can answer
  private readonly predefinedQuestions: PredefinedQuestion[] = [
    {
      keywords: [
        'expense last month',
        'expenses last month',
        'last month expense',
        'last month expenses',
        'monthly expenses',
        'spending last month',
        'spend last month',
        'how much did i spend',
        'expenditure',
      ],
      question: 'What was my total expense in the last month?',
      context: 'Calculate and explain the total expenses from the last month based on transaction data. Provide a breakdown by category if available.',
    },
    {
      keywords: [
        'total income',
        'last month income',
        'monthly income',
        'how much earned',
        'how much did i earn',
        'salary',
        'credits',
        'total credits',
      ],
      question: 'What was my total income in the last month?',
      context: 'Calculate and explain the total income from the last month based on credit transactions. Provide insights on income sources and patterns.',
    },
    {
      keywords: [
        'how to save money',
        'savings tips',
        'ways to save',
        'saving money',
        'reduce expenses',
        'save more',
        'savings strategies',
      ],
      question: 'How can I save money?',
      context: 'Provide practical and actionable savings tips and strategies based on the user\'s spending patterns and transaction history. Include personalized recommendations.',
    },
  ];

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('groq.apiKey');
    this.enabled = !!apiKey;

    if (this.enabled) {
      try {
        this.client = new Groq({
          apiKey,
        });
        this.logger.log('Groq chatbot service initialized');
      } catch (error) {
        this.logger.warn('Failed to initialize Groq client', error);
        this.enabled = false;
      }
    } else {
      this.logger.warn('Groq API key not found, LLM chatbot disabled');
    }
  }

  /**
   * Check if user question matches any predefined question
   */
  findMatchingQuestion(userQuestion: string): PredefinedQuestion | null {
    const lowerQuestion = userQuestion.toLowerCase();

    for (const predefined of this.predefinedQuestions) {
      const matches = predefined.keywords.some((keyword) =>
        lowerQuestion.includes(keyword.toLowerCase()),
      );

      if (matches) {
        this.logger.debug(
          `Matched predefined question: ${predefined.question} for user query: ${userQuestion}`,
        );
        return predefined;
      }
    }

    return null;
  }

  /**
   * Get answer from Groq for a predefined question
   */
  async getAnswerFromGroq(
    predefinedQuestion: PredefinedQuestion,
    userQuestion: string,
    financialContext?: {
      totalDebit: number;
      totalCredit: number;
      totalTransactions: number;
      recentTransactions?: Array<{
        description: string;
        amount: number;
        category: string;
        date: Date;
      }>;
    },
  ): Promise<string | null> {
    if (!this.enabled || !this.client) {
      this.logger.debug('Groq service not available');
      return null;
    }

    try {
      // Build context for the question
      let contextPrompt = predefinedQuestion.context || '';

      if (financialContext) {
        contextPrompt += `\n\nUser's Financial Summary:
- Total Transactions: ${financialContext.totalTransactions}
- Total Debit: ₹${financialContext.totalDebit.toFixed(2)}
- Total Credit: ₹${financialContext.totalCredit.toFixed(2)}`;

        if (financialContext.recentTransactions && financialContext.recentTransactions.length > 0) {
          contextPrompt += `\n\nRecent Transactions:\n${financialContext.recentTransactions
            .slice(0, 5)
            .map(
              (t) =>
                `- ${t.description}: ₹${t.amount.toFixed(2)} (${t.category}) on ${t.date.toISOString().split('T')[0]}`,
            )
            .join('\n')}`;
        }
      }

      const systemPrompt = `You are a helpful financial assistant chatbot for FinFlow. 
You help users understand personal finance and make better financial decisions.

${contextPrompt}

Guidelines:
- Provide clear, practical, and actionable advice
- Use simple language that's easy to understand
- Be conversational and friendly
- Reference the user's financial data when relevant
- Always remind users that this is general advice, not personalized financial advice
- Keep responses concise (2-4 paragraphs max)
- Use markdown formatting for emphasis and lists`;

      const completion = await this.client.chat.completions.create({
        model: 'llama-3.3-70b-versatile', // Best quality model
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `User asked: "${userQuestion}"\n\nPlease answer the question: "${predefinedQuestion.question}"`,
          },
        ],
        temperature: 0.7, // Balanced creativity and consistency
        max_tokens: 500, // Allow detailed responses
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        this.logger.warn('Empty response from Groq');
        return null;
      }

      this.logger.debug(
        `Groq answered predefined question: ${predefinedQuestion.question}`,
      );

      return responseText;
    } catch (error) {
      this.logger.error('Failed to get answer from Groq', error);
      return null;
    }
  }

  /**
   * Get answer for any question (not just predefined)
   */
  async getGeneralAnswer(
    userQuestion: string,
    financialContext?: {
      totalDebit: number;
      totalCredit: number;
      totalTransactions: number;
      recentTransactions?: Array<{
        description: string;
        amount: number;
        category: string;
        date: Date;
      }>;
    },
  ): Promise<string | null> {
    if (!this.enabled || !this.client) {
      return null;
    }

    try {
      let contextPrompt = '';

      if (financialContext) {
        contextPrompt = `\n\nUser's Financial Summary:
- Total Transactions: ${financialContext.totalTransactions}
- Total Debit: ₹${financialContext.totalDebit.toFixed(2)}
- Total Credit: ₹${financialContext.totalCredit.toFixed(2)}`;

        if (financialContext.recentTransactions && financialContext.recentTransactions.length > 0) {
          contextPrompt += `\n\nRecent Transactions:\n${financialContext.recentTransactions
            .slice(0, 5)
            .map(
              (t) =>
                `- ${t.description}: ₹${t.amount.toFixed(2)} (${t.category})`,
            )
            .join('\n')}`;
        }
      }

      const systemPrompt = `You are a helpful financial assistant chatbot for FinFlow.
You help users understand their finances and answer financial questions.

${contextPrompt}

Guidelines:
- Answer the user's question clearly and helpfully
- Use the financial data provided when relevant
- Be conversational and friendly
- Keep responses concise (2-3 paragraphs)
- If the question is not related to finance, politely redirect to financial topics
- Use markdown formatting for emphasis`;

      const completion = await this.client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userQuestion,
          },
        ],
        temperature: 0.7,
        max_tokens: 400,
      });

      return completion.choices[0]?.message?.content || null;
    } catch (error) {
      this.logger.error('Failed to get general answer from Groq', error);
      return null;
    }
  }

  /**
   * Check if Groq service is available
   */
  isAvailable(): boolean {
    return this.enabled && this.client !== null;
  }

  /**
   * Get list of predefined questions (for UI display)
   */
  getPredefinedQuestions(): Array<{ question: string; keywords: string[] }> {
    return this.predefinedQuestions.map((q) => ({
      question: q.question,
      keywords: q.keywords,
    }));
  }
}
