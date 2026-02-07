export const TRANSACTION_CATEGORIES = [
  'Food',
  'Travel',
  'Shopping',
  'Bills',
  'Entertainment',
  'OnlinePayments',
  'Others',
] as const;

export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number];

export const DOCUMENT_PROCESSING_STATUS = {
  UPLOADED: 'uploaded',
  EXTRACTING: 'extracting',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type DocumentProcessingStatus =
  (typeof DOCUMENT_PROCESSING_STATUS)[keyof typeof DOCUMENT_PROCESSING_STATUS];

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const CORRELATION_ID_HEADER = 'x-correlation-id';
