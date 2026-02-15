# Groq LLM Fallback Integration Guide

## Overview

Groq LLM has been integrated as a **fallback option** for transaction categorization and PDF parsing. It only activates when:
1. Regular categorization has **low confidence**
2. PDF parsing fails or returns **no transactions**
3. Groq API key is configured (`GROQ_API_KEY`)

## How It Works

### Fallback Flow

```
1. Try Regular Parsing/Categorization
   ↓
2. Check Confidence/Results
   ↓
3. If Low Confidence OR No Results
   ↓
4. Try Groq LLM Fallback
   ↓
5. Use Groq Result if Better
   ↓
6. Fallback to Original if Groq Fails
```

## Features

### 1. Categorization Fallback

**When it activates:**
- Regular categorization returns `confidence: 'low'`
- Groq API key is configured

**What it does:**
- Analyzes transaction description, amount, and date
- Returns improved categorization with higher confidence
- Extracts additional details (merchant name, transaction type, purpose)

**Example:**
```typescript
// Regular categorization (low confidence)
{
  category: 'Others',
  confidence: 'low',
  reason: 'No matching keywords found'
}

// Groq fallback improves it
{
  category: 'Food',
  confidence: 'high',
  reason: 'Groq LLM: UPI transaction to restaurant merchant'
}
```

### 2. PDF Parsing Fallback

**When it activates:**
- Regular PDF parsing returns 0 transactions
- PDF parsing throws an error
- Groq API key is configured

**What it does:**
- Uses LLM to extract transactions from PDF text
- Parses unstructured bank statement text
- Returns categorized transactions

**Example:**
```typescript
// Regular parsing: 0 transactions
// Groq fallback: Extracts 15 transactions from PDF text
```

## Configuration

### Environment Variable

Add to `.env.local`:
```bash
GROQ_API_KEY=gsk_your-api-key-here
```

### Optional - Works Without API Key

If `GROQ_API_KEY` is not set:
- Service initializes but remains disabled
- All regular functionality continues to work
- No errors or breaking changes
- Logs a warning: "Groq API key not found, categorization fallback disabled"

## Usage

### Automatic (Recommended)

The fallback is **automatic** - no code changes needed:

```typescript
// Existing code works as-is
const transactions = await transactionParser.parsePdf(pdfBuffer);

// If parsing fails or returns 0 transactions, Groq fallback activates automatically
// If categorization has low confidence, Groq improves it automatically
```

### Manual Usage (Optional)

You can also use Groq service directly:

```typescript
// Categorize with Groq
const result = await groqService.categorizeWithGroq(
  'UPI/005722738967/P2V/7250963600@ybl/SONU SRIVASTA',
  150,
  new Date()
);

// Parse PDF text with Groq
const transactions = await groqService.parseTransactionsFromTextWithGroq(pdfText);
```

## Integration Points

### 1. Enhanced Categorization Service

**File:** `enhanced-categorization.service.ts`

**Integration:**
- Checks if categorization confidence is `low`
- Calls Groq service if available
- Uses Groq result if confidence improves

**Code:**
```typescript
// If confidence is low and Groq is available, use it as fallback
if (result.confidence === 'low' && this.groqService?.isAvailable()) {
  const groqResult = await this.groqService.categorizeWithGroq(...);
  if (groqResult && groqResult.confidence !== 'low') {
    return groqResult; // Use improved categorization
  }
}
```

### 2. Transaction Parser Service

**File:** `transaction-parser.service.ts`

**Integration:**
- Tries regular parsing first
- If 0 transactions found, tries Groq fallback
- If parsing error occurs, tries Groq as last resort

**Code:**
```typescript
// Try regular parsing first
const transactions = this.parseTransactionsFromText(pdfText);

// If no transactions and Groq available, try fallback
if (transactions.length === 0 && this.groqService?.isAvailable()) {
  const groqTransactions = await this.groqService.parseTransactionsFromTextWithGroq(pdfText);
  if (groqTransactions && groqTransactions.length > 0) {
    return groqTransactions; // Use Groq extracted transactions
  }
}
```

## Groq Service Details

### Models Used

- **Categorization**: `llama-3.1-70b-versatile` (best quality)
- **Parsing**: `llama-3.1-70b-versatile` (best quality)

### Response Format

**Categorization:**
```json
{
  "category": "Food|Travel|Shopping|Bills|Entertainment|OnlinePayments|Others",
  "confidence": "high|medium|low",
  "reason": "Brief explanation",
  "extractedDetails": {
    "merchantName": "extracted merchant name",
    "transactionType": "UPI|Card|NEFT|IMPS",
    "purpose": "brief purpose"
  }
}
```

**Parsing:**
```json
{
  "transactions": [
    {
      "date": "2024-01-15",
      "description": "transaction description",
      "amount": 123.45,
      "type": "debit|credit",
      "category": "Food|Travel|..."
    }
  ]
}
```

## Performance Considerations

### Cost

- **Free Tier**: 14,400 requests/day
- **Paid**: ~$0.0001 per request
- **Fallback Only**: Only activates when needed, minimizing costs

### Latency

- **Regular Parsing**: ~50-100ms
- **Groq Fallback**: ~200-500ms (added latency only when fallback activates)
- **Total Impact**: Minimal (only when regular parsing fails)

### Rate Limits

- Groq has generous rate limits
- Fallback usage is infrequent (only when needed)
- No rate limit issues expected

## Logging

### Success Logs

```
[GroqCategorizationService] Groq categorized transaction: UPI/... → Food (high)
[TransactionParserService] Groq extracted 15 transactions from PDF
```

### Fallback Activation Logs

```
[EnhancedCategorizationService] Low confidence categorization, trying Groq fallback
[TransactionParserService] No transactions found with regular parsing, trying Groq LLM fallback
```

### Warning Logs

```
[GroqCategorizationService] Groq API key not found, categorization fallback disabled
[TransactionParserService] Groq fallback failed, using original categorization
```

## Testing

### Test Categorization Fallback

```typescript
// Create a transaction with vague description
const result = await enhancedCategorization.categorizeTransactionEnhanced(
  'UPI/123456/P2V/789@ybl/UNKNOWN',
  150
);

// Should trigger Groq fallback if confidence is low
// Check logs for: "Low confidence categorization, trying Groq fallback"
```

### Test Parsing Fallback

```typescript
// Parse a PDF that regular parser can't handle
const transactions = await transactionParser.parsePdf(pdfBuffer);

// If 0 transactions, Groq fallback should activate
// Check logs for: "No transactions found with regular parsing, trying Groq LLM fallback"
```

## Troubleshooting

### Issue: Groq not activating

**Check:**
1. Is `GROQ_API_KEY` set in `.env.local`?
2. Check logs for: "Groq API key not found"
3. Verify API key is valid

**Solution:**
```bash
# Add to .env.local
GROQ_API_KEY=gsk_your-api-key-here
```

### Issue: Groq fallback failing

**Check:**
1. Check logs for Groq errors
2. Verify API key is valid
3. Check network connectivity

**Solution:**
- Service gracefully falls back to original categorization
- No breaking changes
- Check Groq API status

### Issue: High costs

**Check:**
1. How often is fallback activating?
2. Check Groq usage dashboard

**Solution:**
- Fallback only activates when needed
- Consider adjusting categorization thresholds
- Monitor Groq usage

## Best Practices

1. **Keep API Key Secure**: Don't commit to git
2. **Monitor Usage**: Check Groq dashboard regularly
3. **Test Fallback**: Verify it works when needed
4. **Log Analysis**: Monitor logs for fallback activation frequency
5. **Cost Optimization**: Adjust thresholds if fallback activates too often

## Future Enhancements

Potential improvements:

1. **Configurable Thresholds**: Adjust when fallback activates
2. **Caching**: Cache Groq responses for similar transactions
3. **Batch Processing**: Process multiple transactions in one Groq call
4. **Confidence Thresholds**: Customize confidence levels
5. **User Feedback**: Learn from user corrections

## Summary

✅ **Automatic**: No code changes needed  
✅ **Optional**: Works without API key  
✅ **Fallback Only**: Only activates when needed  
✅ **Non-Breaking**: Existing functionality unchanged  
✅ **Cost-Effective**: Free tier covers most needs  
✅ **Fast**: ~200-500ms when activated  

The Groq fallback is now integrated and ready to use. Just add `GROQ_API_KEY` to your `.env.local` file!
