# Chatbot Groq LLM Implementation Guide

## Overview

The chatbot service now uses **Groq LLM** to answer predefined financial questions intelligently, with fallback to keyword-based responses.

---

## Features

### ✅ **Predefined Questions with Groq**

The chatbot can answer these predefined questions using Groq LLM:

1. **Spending & Expenses**
   - Keywords: `spending`, `spend`, `expenses`, `expenditure`
   - Question: "How can I reduce my spending?"

2. **Budgeting**
   - Keywords: `budget`, `budgeting`, `plan`, `planning`
   - Question: "How should I create a budget?"

3. **Savings**
   - Keywords: `save`, `saving`, `savings`
   - Question: "What are the best ways to save money?"

4. **Investments**
   - Keywords: `invest`, `investment`, `investing`
   - Question: "How should I start investing?"

5. **Debt Management**
   - Keywords: `debt`, `loan`, `credit`
   - Question: "How can I manage my debt effectively?"

6. **Expense Categorization**
   - Keywords: `category`, `categories`, `spending by category`
   - Question: "How should I categorize my expenses?"

7. **Personal Finance Basics**
   - Keywords: `financial`, `finance`, `money management`
   - Question: "What are the basics of personal finance?"

8. **Emergency Fund**
   - Keywords: `emergency`, `emergency fund`
   - Question: "How much should I have in an emergency fund?"

9. **Retirement Planning**
   - Keywords: `retirement`, `retire`
   - Question: "How should I plan for retirement?"

10. **Tax Optimization**
    - Keywords: `tax`, `taxes`, `taxation`
    - Question: "How can I optimize my taxes?"

---

## How It Works

### Flow Diagram

```
User Question
    ↓
Check if matches predefined question keywords
    ↓
If Match → Use Groq LLM with financial context
    ↓
If No Match → Try Groq for general answer
    ↓
If Groq fails → Fallback to keyword-based responses
    ↓
Return Answer
```

### Step-by-Step Process

1. **Get User's Financial Data**
   - Total transactions, debits, credits
   - Recent transactions (last 5)

2. **Check Predefined Questions**
   - Match user question keywords with predefined questions
   - If match found, use Groq with specific context

3. **Groq LLM Processing**
   - Send question + financial context to Groq
   - Groq generates intelligent answer
   - Answer includes user's financial data

4. **Fallback Logic**
   - If Groq unavailable → Use keyword-based responses
   - If Groq fails → Use keyword-based responses
   - Always has a response

---

## API Endpoints

### 1. Ask Question

**Endpoint:** `POST /chatbot/ask`

**Request:**
```json
{
  "message": "How can I reduce my spending?"
}
```

**Response:**
```json
{
  "answer": "Based on your spending patterns, here are some practical tips to reduce your expenses:\n\n1. **Review Your Categories**: You've spent ₹5,000 on Food this month. Consider meal planning and cooking at home more often...\n\n2. **Track Small Expenses**: Small purchases add up quickly. Track every expense, no matter how small...\n\n[Detailed Groq-generated answer]"
}
```

### 2. Get Predefined Questions

**Endpoint:** `GET /chatbot/questions`

**Response:**
```json
{
  "questions": [
    {
      "question": "How can I reduce my spending?",
      "keywords": ["spending", "spend", "expenses", "expenditure"]
    },
    {
      "question": "How should I create a budget?",
      "keywords": ["budget", "budgeting", "plan", "planning"]
    }
    // ... more questions
  ],
  "groqEnabled": true
}
```

---

## Configuration

### Environment Variables

Add to `.env.local`:

```bash
GROQ_API_KEY=gsk_your-api-key-here
```

### Optional - Works Without API Key

If `GROQ_API_KEY` is not set:
- ✅ Service initializes but Groq is disabled
- ✅ Falls back to keyword-based responses
- ✅ No errors or breaking changes
- ⚠️ Logs warning: "Groq API key not found, LLM chatbot disabled"

---

## Examples

### Example 1: Predefined Question

**User:** "How can I save money?"

**Process:**
1. Matches keyword: `save`
2. Finds predefined question: "What are the best ways to save money?"
3. Gets financial context: Total debit ₹10,000, 50 transactions
4. Groq generates answer with personalized tips

**Response:**
```
Based on your spending of ₹10,000 across 50 transactions, here are effective ways to save money:

1. **Automate Savings**: Set up automatic transfers to a savings account...
2. **Reduce Recurring Expenses**: Review your subscriptions and bills...
3. **Track Your Spending**: Use the FinFlow app to monitor where your money goes...

[More detailed advice from Groq]
```

### Example 2: General Question

**User:** "What is compound interest?"

**Process:**
1. No predefined match
2. Tries Groq for general answer
3. Groq explains compound interest

**Response:**
```
Compound interest is when you earn interest on both your initial investment and the interest you've already earned...

[Groq-generated explanation]
```

### Example 3: Fallback (No Groq)

**User:** "Where am I spending most?"

**Process:**
1. Groq not available or failed
2. Uses keyword-based response
3. Returns data-based answer

**Response:**
```
You're spending most on ₹5,000 total debits and ₹2,000 total credits.
```

---

## Financial Context Provided to Groq

When answering questions, Groq receives:

```typescript
{
  totalDebit: 10000.50,
  totalCredit: 2000.00,
  totalTransactions: 50,
  recentTransactions: [
    {
      description: "UPI/005722738967/P2V/7250963600@ybl/SONU SRIVASTA",
      amount: 500,
      category: "Food",
      date: "2024-01-15"
    },
    // ... more transactions
  ]
}
```

This allows Groq to provide **personalized** answers based on the user's actual financial data.

---

## Predefined Questions List

| Question | Keywords | Use Case |
|----------|----------|----------|
| How can I reduce my spending? | spending, spend, expenses | Expense reduction tips |
| How should I create a budget? | budget, budgeting, plan | Budgeting guidance |
| What are the best ways to save money? | save, saving, savings | Savings strategies |
| How should I start investing? | invest, investment | Investment basics |
| How can I manage my debt effectively? | debt, loan, credit | Debt management |
| How should I categorize my expenses? | category, categories | Expense categorization |
| What are the basics of personal finance? | financial, finance | Finance fundamentals |
| How much should I have in an emergency fund? | emergency, emergency fund | Emergency fund planning |
| How should I plan for retirement? | retirement, retire | Retirement planning |
| How can I optimize my taxes? | tax, taxes | Tax optimization |

---

## Adding New Predefined Questions

To add a new predefined question, edit `groq-chatbot.service.ts`:

```typescript
private readonly predefinedQuestions: PredefinedQuestion[] = [
  // ... existing questions
  {
    keywords: ['new', 'keyword', 'here'],
    question: 'Your new question here?',
    context: 'Additional context for the question.',
  },
];
```

---

## Testing

### Test Predefined Question

```bash
curl -X POST http://localhost:3004/chatbot/ask \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "How can I reduce my spending?"}'
```

### Test General Question

```bash
curl -X POST http://localhost:3004/chatbot/ask \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "What is a savings account?"}'
```

### Get Predefined Questions

```bash
curl -X GET http://localhost:3004/chatbot/questions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Performance

### Response Times

- **Groq LLM**: ~200-500ms (very fast!)
- **Keyword-based**: ~10-50ms (instant)
- **Fallback**: Automatic if Groq fails

### Cost

- **Free Tier**: 14,400 requests/day
- **Paid**: ~$0.0001 per request
- **Very affordable** for chatbot use case

---

## Troubleshooting

### Issue: Groq not answering questions

**Check:**
1. Is `GROQ_API_KEY` set in `.env.local`?
2. Check logs for: "Groq API key not found"
3. Verify API key is valid

**Solution:**
```bash
# Add to .env.local
GROQ_API_KEY=gsk_your-api-key-here
```

### Issue: Questions not matching predefined questions

**Check:**
1. Review keywords in `predefinedQuestions`
2. Check if user question contains keywords
3. Check logs for matching attempts

**Solution:**
- Add more keywords to predefined questions
- Or use general Groq answer (already implemented)

### Issue: Groq responses are too long

**Solution:**
- Adjust `max_tokens` in `groq-chatbot.service.ts`
- Current: 500 tokens for predefined, 400 for general
- Reduce if needed: `max_tokens: 300`

---

## Summary

✅ **Implemented:**
- Groq LLM integration for chatbot
- 10 predefined financial questions
- General question answering
- Financial context integration
- Fallback to keyword-based responses
- Predefined questions endpoint

✅ **Features:**
- Fast responses (~200-500ms)
- Cost-effective (free tier available)
- Personalized answers based on user data
- Graceful fallback if Groq unavailable

✅ **Next Steps:**
1. Add `GROQ_API_KEY` to `.env.local`
2. Test with predefined questions
3. Customize predefined questions as needed

The chatbot is now powered by Groq LLM! 🚀
