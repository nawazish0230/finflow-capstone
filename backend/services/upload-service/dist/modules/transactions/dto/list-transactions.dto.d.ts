export declare class ListTransactionsDto {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    type?: 'debit' | 'credit';
    dateFrom?: string;
    dateTo?: string;
}
