export declare const TRANSACTION_CATEGORIES: readonly ["Food", "Travel", "Shopping", "Bills", "Entertainment", "OnlinePayments", "Others"];
export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number];
export declare const DOCUMENT_PROCESSING_STATUS: {
    readonly UPLOADED: "uploaded";
    readonly EXTRACTING: "extracting";
    readonly COMPLETED: "completed";
    readonly FAILED: "failed";
};
export type DocumentProcessingStatus = (typeof DOCUMENT_PROCESSING_STATUS)[keyof typeof DOCUMENT_PROCESSING_STATUS];
export declare const PAGINATION: {
    readonly DEFAULT_PAGE: 1;
    readonly DEFAULT_LIMIT: 20;
    readonly MAX_LIMIT: 100;
};
export declare const CORRELATION_ID_HEADER = "x-correlation-id";
