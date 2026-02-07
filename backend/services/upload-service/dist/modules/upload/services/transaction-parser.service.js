"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var TransactionParserService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionParserService = void 0;
const common_1 = require("@nestjs/common");
const pdf_parse_1 = require("pdf-parse");
const CATEGORY_KEYWORDS = {
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
let TransactionParserService = TransactionParserService_1 = class TransactionParserService {
    logger = new common_1.Logger(TransactionParserService_1.name);
    async parsePdf(buffer, password) {
        try {
            const parser = new pdf_parse_1.PDFParse({
                data: buffer,
                password,
            });
            const result = await parser.getText();
            this.logger.debug(`Extracted ${result.text.length} chars from PDF via pdf-parse`);
            return this.parseTransactionsFromText(result.text);
        }
        catch (error) {
            this.logger.error('Failed to parse PDF', error);
            return [];
        }
    }
    parseTransactionsFromText(text) {
        const transactions = [];
        const lines = text
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean);
        const datePattern = /(\d{1,2}\/\d{1,2}\/\d{2,4})/;
        const amountPattern = /(\d+\.?\d*)/g;
        const typePattern = /\b(CR|DR|DEBIT|CREDIT)\b/i;
        for (const line of lines) {
            const dateMatch = line.match(datePattern);
            if (!dateMatch)
                continue;
            const dateStr = dateMatch[1];
            const dateIndex = dateMatch.index ?? 0;
            const amounts = [];
            let match;
            while ((match = amountPattern.exec(line)) !== null) {
                amounts.push({ value: match[1], index: match.index ?? 0 });
            }
            if (amounts.length === 0)
                continue;
            const typeMatch = line.match(typePattern);
            const typeIndicator = typeMatch ? typeMatch[1].toUpperCase() : null;
            let transactionAmountStr = null;
            let transactionAmountIndex = -1;
            if (typeMatch && typeMatch.index !== undefined) {
                const typeIndex = typeMatch.index;
                const amountBeforeType = amounts
                    .filter((a) => a.index < typeIndex)
                    .sort((a, b) => b.index - a.index)[0];
                if (amountBeforeType) {
                    transactionAmountStr = amountBeforeType.value;
                    transactionAmountIndex = amountBeforeType.index;
                }
            }
            if (!transactionAmountStr) {
                const amountsAfterDate = amounts.filter((a) => a.index > dateIndex + dateStr.length);
                if (amountsAfterDate.length > 0) {
                    transactionAmountStr = amountsAfterDate[0].value;
                    transactionAmountIndex = amountsAfterDate[0].index;
                }
                else if (amounts.length > 0) {
                    transactionAmountStr = amounts[0].value;
                    transactionAmountIndex = amounts[0].index;
                }
            }
            if (!transactionAmountStr)
                continue;
            const amount = parseFloat(transactionAmountStr);
            if (isNaN(amount) || amount === 0)
                continue;
            let type = 'debit';
            if (typeIndicator) {
                type = /CR|CREDIT/i.test(typeIndicator) ? 'credit' : 'debit';
            }
            else {
                const isDebit = amount < 0 ||
                    /\bDR\b/i.test(line) ||
                    /\bdebit\b/i.test(line) ||
                    /\bwithdraw/i.test(line) ||
                    /\bpurchase/i.test(line) ||
                    /\bpayment\b/i.test(line);
                const isCredit = /\bCR\b/i.test(line) ||
                    /\bcredit\b/i.test(line) ||
                    /\bdeposit/i.test(line) ||
                    /\brefund/i.test(line);
                type = isCredit && !isDebit ? 'credit' : 'debit';
            }
            let descriptionStartIndex = transactionAmountIndex + transactionAmountStr.length;
            if (typeMatch && typeMatch.index !== undefined) {
                descriptionStartIndex = Math.max(descriptionStartIndex, typeMatch.index + typeMatch[0].length);
            }
            let description = line
                .substring(descriptionStartIndex)
                .trim()
                .replace(/\s+/g, ' ');
            if (amounts.length > 1) {
                const balanceAmount = amounts.find((a) => a.index > transactionAmountIndex &&
                    a.value !== transactionAmountStr);
                if (balanceAmount && description.includes(balanceAmount.value)) {
                    description = description.replace(balanceAmount.value, '').trim();
                }
            }
            description = description.replace(/^\d+\.?\d*\s*/, '').trim();
            if (!description) {
                description = line
                    .replace(dateStr, '')
                    .replace(transactionAmountStr, '')
                    .replace(typePattern, '')
                    .trim()
                    .replace(/\s+/g, ' ');
            }
            const parsedDate = this.parseDate(dateStr);
            if (!parsedDate)
                continue;
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
    parseDate(dateStr) {
        try {
            const slashMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
            if (slashMatch) {
                const [, d, m, y] = slashMatch;
                const day = parseInt(d);
                const month = parseInt(m);
                const year = y.length === 2 ? 2000 + parseInt(y) : parseInt(y);
                if (day > 12) {
                    return new Date(year, month - 1, day);
                }
                const date1 = new Date(year, month - 1, day);
                const date2 = new Date(year, day - 1, month);
                if (date1.getDate() === day && date1.getMonth() === month - 1) {
                    return date1;
                }
                if (date2.getDate() === month && date2.getMonth() === day - 1) {
                    return date2;
                }
                return date1;
            }
            const dashMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
            if (dashMatch) {
                const [, y, m, d] = dashMatch;
                return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
            }
            const monMatch = dateStr.match(/(\d{1,2})-([A-Za-z]{3})-(\d{2,4})/);
            if (monMatch) {
                const [, day, mon, y] = monMatch;
                const year = y.length === 2 ? 2000 + parseInt(y) : parseInt(y);
                const months = {
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
            const d = new Date(dateStr);
            if (!isNaN(d.getTime()))
                return d;
            return null;
        }
        catch {
            return null;
        }
    }
    categorizeTransaction(description) {
        const lowerDesc = description.toLowerCase();
        for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
            if (category === 'Others')
                continue;
            for (const keyword of keywords) {
                if (lowerDesc.includes(keyword.toLowerCase())) {
                    return category;
                }
            }
        }
        return 'Others';
    }
    categorizeTransactions(transactions) {
        return transactions.map((t) => this.categorizeTransaction(t.description));
    }
};
exports.TransactionParserService = TransactionParserService;
exports.TransactionParserService = TransactionParserService = TransactionParserService_1 = __decorate([
    (0, common_1.Injectable)()
], TransactionParserService);
//# sourceMappingURL=transaction-parser.service.js.map