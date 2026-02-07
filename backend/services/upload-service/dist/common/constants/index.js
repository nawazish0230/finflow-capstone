"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CORRELATION_ID_HEADER = exports.PAGINATION = exports.DOCUMENT_PROCESSING_STATUS = exports.TRANSACTION_CATEGORIES = void 0;
exports.TRANSACTION_CATEGORIES = [
    'Food',
    'Travel',
    'Shopping',
    'Bills',
    'Entertainment',
    'OnlinePayments',
    'Others',
];
exports.DOCUMENT_PROCESSING_STATUS = {
    UPLOADED: 'uploaded',
    EXTRACTING: 'extracting',
    COMPLETED: 'completed',
    FAILED: 'failed',
};
exports.PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
};
exports.CORRELATION_ID_HEADER = 'x-correlation-id';
//# sourceMappingURL=index.js.map