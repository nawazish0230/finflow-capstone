# Enhanced Categorization and Duplicate Detection Guide

## Overview

This guide explains the new enhanced categorization and duplicate detection features that have been added to the upload service. These features improve transaction categorization accuracy, especially for UPI transactions, and prevent duplicate transaction uploads.

## Features

### 1. Enhanced UPI Categorization

The enhanced categorization service improves categorization of UPI transactions by:

- **Parsing UPI strings** to extract:
  - Beneficiary ID (e.g., `ybl`, `okaxis`)
  - Beneficiary Name (e.g., `SONU SRIVASTA`, `PhonePe`, `GOOGLEPAY`)
  - Transaction Type (`P2V` = Person to Vendor, `P2M` = Person to Merchant)

- **Using amount heuristics**:
  - Small amounts (< ₹500) → Likely Food/Travel
  - Round amounts (₹1000, ₹2000) → Likely Personal Transfer/Withdrawal
  - Exact amounts (₹199, ₹299) → Likely Subscription/Bills

- **Transaction type analysis**:
  - `P2V` → Likely Personal Transfer or Small Purchase
  - `P2M` → Likely Merchant Payment

- **Fallback to "Others"** if unable to categorize

### 2. Duplicate Detection

The duplicate detection service uses a hash-based approach:

- **Hash Generation**: `SHA-256(date-amount-description-userId)`
- **Duplicate Check**: Checks if hash exists in database
- **Bulk Detection**: Efficiently checks multiple transactions at once

## Usage

### Option 1: Use Enhanced Features in Upload Service

```typescript
// In upload.service.ts, replace processDocument with:
await this.processDocumentWithEnhancedFeatures(
  userId,
  documentId,
  storageKey,
  password,
  {
    skipDuplicates: true, // Skip duplicates instead of inserting them
  }
);
```

### Option 2: Use Enhanced Features Directly in Transactions Service

```typescript
// Create transactions with enhanced features
const result = await transactionsService.createManyWithEnhancedFeatures(
  userId,
  documentId,
  transactions, // Array of { date, description, amount, type, rawMerchant? }
  {
    skipDuplicates: true,
    recategorize: false,
  }
);

// Result includes:
// - created: number of transactions created
// - duplicates: number of duplicates detected
// - results: array of EnhancedTransactionResult with categorization info
```

### Option 3: Check for Duplicates Before Inserting

```typescript
// Check if a single transaction is duplicate
const duplicateInfo = await transactionsService.getDuplicateInfo(
  userId,
  date,
  amount,
  description
);

if (duplicateInfo.isDuplicate) {
  console.log('Duplicate found:', duplicateInfo.existingTransactionId);
}
```

### Option 4: Re-categorize Existing Transactions

```typescript
// Re-categorize all transactions for a user
const result = await transactionsService.recategorizeTransactions(userId);

// Or re-categorize specific transactions
const result = await transactionsService.recategorizeTransactions(
  userId,
  ['transaction-id-1', 'transaction-id-2']
);

// Result includes:
// - updated: number of transactions updated
// - unchanged: number of transactions unchanged
```

## Enhanced Categorization Examples

### Example 1: UPI Transaction with P2M

```
Input:
- Description: "UPI/005030978101/P2M/BILLDESKPP@ybl/PhonePe"
- Amount: 299

Result:
- Category: Bills
- Confidence: High
- Reason: P2M transaction with subscription-like amount
```

### Example 2: UPI Transaction with P2V and Small Amount

```
Input:
- Description: "UPI/005722738967/P2V/7250963600@ybl/SONU SRIVASTA"
- Amount: 150

Result:
- Category: Food
- Confidence: Medium
- Reason: P2V transaction with small amount (< ₹500)
```

### Example 3: Round Amount Transfer

```
Input:
- Description: "UPI/005719296228/P2V/goog-payment@okaxis/GOOGLEPAY"
- Amount: 2000

Result:
- Category: Others
- Confidence: Medium
- Reason: P2V transaction with round amount (likely transfer)
```

## Duplicate Detection Examples

### Example 1: Check Single Transaction

```typescript
const result = await duplicateDetection.checkDuplicate(
  new Date('2024-01-15'),
  500.00,
  'UPI/005722738967/P2V/7250963600@ybl/SONU SRIVASTA',
  'user-123'
);

if (result.isDuplicate) {
  console.log('Duplicate found!');
  console.log('Existing transaction ID:', result.existingTransactionId);
  console.log('Existing transaction date:', result.existingTransactionDate);
}
```

### Example 2: Bulk Check

```typescript
const transactions = [
  { date: new Date('2024-01-15'), amount: 500, description: 'Transaction 1' },
  { date: new Date('2024-01-16'), amount: 300, description: 'Transaction 2' },
];

const duplicateResults = await duplicateDetection.checkDuplicates(
  transactions,
  'user-123'
);

duplicateResults.forEach((result, index) => {
  if (result.isDuplicate) {
    console.log(`Transaction ${index} is a duplicate`);
  }
});
```

## Database Schema Changes

The transaction schema now includes:

```typescript
{
  // ... existing fields
  transactionHash?: string; // Hash for duplicate detection (indexed)
}
```

**Index**: `{ userId: 1, transactionHash: 1 }` for efficient duplicate lookups

## API Response Format

### Enhanced Transaction Result

```typescript
{
  transaction: TransactionDocument | null,
  wasDuplicate: boolean,
  categorizationConfidence: 'high' | 'medium' | 'low',
  categorizationReason?: string
}
```

### Duplicate Check Result

```typescript
{
  isDuplicate: boolean,
  existingTransactionId?: string,
  existingTransactionDate?: Date,
  hash: string
}
```

## Migration Notes

### Existing Behavior Unchanged

- The original `createMany()` method remains unchanged
- The original `processDocument()` method remains unchanged
- All existing functionality continues to work as before

### New Methods Available

- `createManyWithEnhancedFeatures()` - New method with enhanced features
- `processDocumentWithEnhancedFeatures()` - New upload processing method
- `recategorizeTransactions()` - Re-categorize existing transactions
- `getDuplicateInfo()` - Check for duplicates

### Gradual Migration

You can gradually migrate to the new features:

1. **Phase 1**: Use enhanced features for new uploads only
2. **Phase 2**: Re-categorize existing transactions
3. **Phase 3**: Enable duplicate detection for all uploads

## Configuration

### Enable Enhanced Features

To use enhanced features, call the new methods:

```typescript
// Instead of:
await transactionsService.createMany(userId, documentId, transactions);

// Use:
await transactionsService.createManyWithEnhancedFeatures(
  userId,
  documentId,
  transactions,
  { skipDuplicates: true }
);
```

### Skip Duplicates

When `skipDuplicates: true`:
- Duplicate transactions are not inserted
- Result includes information about skipped duplicates
- Existing transaction information is returned in results

When `skipDuplicates: false` (default):
- Duplicate transactions are still inserted
- Result includes duplicate flag for each transaction
- Useful for auditing or user confirmation

## Performance Considerations

### Hash Generation

- Hash generation is fast (SHA-256)
- No external dependencies
- Suitable for bulk operations

### Duplicate Detection

- Uses indexed database queries
- Efficient for checking multiple transactions
- Single query for bulk duplicate checks

### Categorization

- Enhanced categorization adds minimal overhead
- Uses regex parsing for UPI strings
- Falls back to keyword matching for non-UPI transactions

## Testing

### Test Enhanced Categorization

```typescript
const categorizationService = new EnhancedCategorizationService();

const result = categorizationService.categorizeTransactionEnhanced(
  'UPI/005722738967/P2V/7250963600@ybl/SONU SRIVASTA',
  150
);

console.log('Category:', result.category);
console.log('Confidence:', result.confidence);
console.log('Reason:', result.reason);
```

### Test Duplicate Detection

```typescript
const duplicateService = new DuplicateDetectionService(/* ... */);

const hash = duplicateService.generateTransactionHash(
  new Date('2024-01-15'),
  500.00,
  'Transaction description',
  'user-123'
);

console.log('Hash:', hash);
```

## Troubleshooting

### Issue: Transactions not being categorized correctly

**Solution**: Check the categorization confidence and reason:
```typescript
const result = await transactionsService.createManyWithEnhancedFeatures(...);
result.results.forEach(r => {
  console.log('Confidence:', r.categorizationConfidence);
  console.log('Reason:', r.categorizationReason);
});
```

### Issue: Duplicates not being detected

**Solution**: Verify hash generation:
```typescript
const hash = duplicateDetection.generateTransactionHash(
  date, amount, description, userId
);
console.log('Generated hash:', hash);
```

### Issue: Performance issues with bulk operations

**Solution**: Use bulk duplicate checking:
```typescript
// Efficient: Single query for all transactions
const results = await duplicateDetection.checkDuplicates(
  transactions,
  userId
);
```

## Future Enhancements

Potential improvements:

1. **Machine Learning**: Train ML model for better categorization
2. **User Feedback**: Allow users to correct categories and learn from feedback
3. **Fuzzy Matching**: Use fuzzy string matching for duplicate detection
4. **Statement Metadata**: Track statement periods to detect duplicate uploads
5. **Category Suggestions**: Suggest categories based on user's transaction history

## Support

For questions or issues:
1. Check the categorization confidence and reason
2. Review duplicate detection results
3. Check transaction hash values
4. Review logs for detailed information
