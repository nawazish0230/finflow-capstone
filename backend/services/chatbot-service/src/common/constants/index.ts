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

export const CORRELATION_ID_HEADER = 'x-correlation-id';
export const INTERNAL_API_KEY_HEADER = 'x-internal-api-key';
