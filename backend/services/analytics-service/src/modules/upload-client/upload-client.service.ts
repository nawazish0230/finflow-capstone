import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type { TransactionCategory } from "../../common/constants";

export interface ApiResponse<T> {
  data?: T;
  meta?: { page?: number; limit?: number; total?: number };
  timestamp?: string;
}

export interface TransactionRecord {
  _id: string;
  userId: string;
  documentId: string;
  date: Date;
  description: string;
  amount: number;
  type: "debit" | "credit";
  category: TransactionCategory;
  rawMerchant?: string;
}

export interface TransactionSummary {
  totalDebit: number;
  totalCredit: number;
  totalTransactions: number;
}

export interface PaginatedTransactionsResponse {
  items: TransactionRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface ListTransactionsParams {
  search?: string;
  category?: TransactionCategory;
  type?: "debit" | "credit";
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class UploadClientService {
  private readonly logger = new Logger(UploadClientService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService
  ) {
    this.baseUrl =
      this.config.get<string>("upload.serviceUrl") ?? "http://localhost:3000";
  }

  private logRequestError(
    context: string,
    userId: string,
    error: unknown
  ): void {
    const err = error as Error & {
      response?: { status?: number; data?: unknown };
      code?: string;
    };
    let message = err.message ?? String(error);
    if (err.response) {
      message = `status ${err.response.status}, body: ${JSON.stringify(
        err.response.data
      )}`;
    } else if (err.code) {
      message = `${err.code}: ${message}`;
    }
    if (typeof (error as { errors?: unknown[] })?.errors === "object") {
      const agg = error as { errors: unknown[] };
      message += ` [${agg.errors
        .map((e: unknown) => (e as Error).message)
        .join(", ")}]`;
    }
    this.logger.error(`Failed to ${context} for user ${userId}: ${message}`);
  }

  async getTransactionsSummary(
    userId: string,
    authToken: string
  ): Promise<TransactionSummary> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<ApiResponse<TransactionSummary>>(
          `${this.baseUrl}/transactions/summary`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        )
      );
      return response.data?.data ?? (response.data as unknown as TransactionSummary);
    } catch (error) {
      this.logRequestError("fetch transactions summary", userId, error);
      throw error;
    }
  }

  async listTransactions(
    userId: string,
    authToken: string,
    params: ListTransactionsParams = {}
  ): Promise<PaginatedTransactionsResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params.search) queryParams.append("search", params.search);
      if (params.category) queryParams.append("category", params.category);
      if (params.type) queryParams.append("type", params.type);
      if (params.dateFrom) queryParams.append("dateFrom", params.dateFrom);
      if (params.dateTo) queryParams.append("dateTo", params.dateTo);
      if (params.page) queryParams.append("page", params.page.toString());
      if (params.limit) queryParams.append("limit", params.limit.toString());

      const url = `${this.baseUrl}/transactions${
        queryParams.toString() ? `?${queryParams.toString()}` : ""
      }`;
      const response = await firstValueFrom(
        this.httpService.get<ApiResponse<PaginatedTransactionsResponse>>(url, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        })
      );
      return (
        response.data?.data ??
        (response.data as unknown as PaginatedTransactionsResponse)
      );
    } catch (error) {
      this.logRequestError("list transactions", userId, error);
      throw error;
    }
  }

  async getAllTransactionsForUser(
    userId: string,
    authToken: string,
    filters?: {
      category?: TransactionCategory;
      type?: "debit" | "credit";
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<TransactionRecord[]> {
    const allTransactions: TransactionRecord[] = [];
    let page = 1;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const params: ListTransactionsParams = {
        page,
        limit,
      };
      if (filters?.category) params.category = filters.category;
      if (filters?.type) params.type = filters.type;
      if (filters?.startDate) params.dateFrom = filters.startDate.toISOString();
      if (filters?.endDate) params.dateTo = filters.endDate.toISOString();

      const response = await this.listTransactions(userId, authToken, params);
      allTransactions.push(...response.items);

      hasMore =
        response.items.length === limit && page * limit < response.total;
      page++;
    }

    return allTransactions;
  }
}
