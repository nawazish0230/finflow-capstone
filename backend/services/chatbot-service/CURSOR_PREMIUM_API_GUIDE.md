# Using Cursor Premium API Keys - Important Information

## ⚠️ Important: Cursor Premium API is NOT for External Applications

**Short Answer:** Cursor Premium's API access is **only for IDE features** (code completion, chat, etc.), not for your application's chatbot service.

**Why You Can't Use Cursor's API:**
1. **Terms of Service**: Cursor's API is licensed for IDE use only
2. **No Public API**: Cursor doesn't expose an API for external applications
3. **Rate Limits**: Designed for IDE usage, not production applications
4. **Account Risk**: Using it for external apps could violate ToS and risk account suspension

---

## ✅ Better Approach: Get Direct API Keys

Instead of using Cursor's API, get **direct API keys** from LLM providers. This is:
- ✅ **Legal**: Proper usage according to provider terms
- ✅ **Reliable**: Designed for production applications
- ✅ **Cost-effective**: Many providers offer free tiers
- ✅ **Better Control**: Manage your own usage and costs

---

## 🆓 Free/Low-Cost API Keys You Can Get Today

### 1. **Groq** ⭐ **BEST FREE TIER** (Recommended)

**Why Start Here:**
- ✅ **14,400 requests/day FREE** (very generous!)
- ✅ **Fastest responses** (~200-500ms)
- ✅ **High quality** (Llama 3 models)
- ✅ **No credit card required** for free tier

**How to Get:**
1. Go to: https://console.groq.com
2. Sign up with email (or Google/GitHub)
3. Get API key immediately
4. Start using right away!

**Free Tier Limits:**
- 14,400 requests/day
- No credit card needed
- Perfect for development and testing

**Cost After Free Tier:**
- ~$0.0001 per query (~$1/month for 10K queries)

---

### 2. **OpenAI** (Free Credits Available)

**How to Get:**
1. Go to: https://platform.openai.com
2. Sign up
3. Get **$5 free credits** (new accounts)
4. Credits expire after 3 months

**Free Credits:**
- $5 free (enough for ~8,000 GPT-3.5 queries)
- Good for testing

**Cost After Credits:**
- GPT-3.5 Turbo: ~$0.0006 per query
- GPT-4o Mini: ~$0.0002 per query

---

### 3. **Google Gemini** (Free Tier)

**How to Get:**
1. Go to: https://aistudio.google.com
2. Sign in with Google account
3. Get API key
4. **60 requests/minute FREE** (no credit card)

**Free Tier:**
- 60 requests/minute
- 86,400 requests/day (if evenly distributed)
- Good for development

---

### 4. **Anthropic Claude** (Free Trial)

**How to Get:**
1. Go to: https://console.anthropic.com
2. Sign up
3. Get free trial credits
4. Good for testing Claude models

---

## 🚀 Quick Setup: Groq (Recommended)

**Step 1: Get API Key**
```bash
# Visit: https://console.groq.com
# Sign up → Get API key → Copy it
```

**Step 2: Add to Your Project**
```bash
# In chatbot-service/.env.local
GROQ_API_KEY=gsk_your-api-key-here
```

**Step 3: Install Package**
```bash
cd backend/services/chatbot-service
npm install groq-sdk
```

**Step 4: Use in Code**
```typescript
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const completion = await groq.chat.completions.create({
  model: 'llama-3.1-70b-versatile',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

**That's it!** You're ready to use Groq's free tier.

---

## 💡 Why Direct API Keys Are Better

### 1. **Legal & Compliant**
- ✅ Follows provider terms of service
- ✅ No risk of account suspension
- ✅ Proper usage tracking

### 2. **Production Ready**
- ✅ Designed for applications
- ✅ Proper rate limits
- ✅ SLA guarantees (on paid tiers)

### 3. **Cost Control**
- ✅ Transparent pricing
- ✅ Usage monitoring
- ✅ Budget alerts

### 4. **Flexibility**
- ✅ Switch providers easily
- ✅ Use multiple providers
- ✅ Fallback options

---

## 📊 Cost Comparison (Free Tiers)

| Provider | Free Tier | Best For |
|----------|-----------|----------|
| **Groq** | 14,400 requests/day | ⭐ **Best free tier** |
| **Gemini** | 60 requests/minute | Development |
| **OpenAI** | $5 credits | Testing |
| **Claude** | Trial credits | Testing |

---

## 🎯 Recommendation

**For FinFlow Chatbot:**

1. **Start with Groq** (free tier covers most needs)
   - 14,400 requests/day FREE
   - Fastest responses
   - No credit card needed

2. **If you need more:**
   - Groq paid: ~$1/month for 10K queries
   - Or switch to GPT-4o Mini: ~$2/month

3. **Development:**
   - Use Groq free tier
   - Test with real users
   - Monitor usage

4. **Production:**
   - Start with Groq free tier
   - Upgrade to paid if needed (~$1-10/month)

---

## 🔒 Security Best Practices

**Never commit API keys to Git:**
```bash
# ✅ Good: Use .env.local (in .gitignore)
GROQ_API_KEY=gsk_...

# ❌ Bad: Hardcode in code
const apiKey = 'gsk_...'; // DON'T DO THIS!
```

**Use Environment Variables:**
```typescript
// ✅ Good
const apiKey = process.env.GROQ_API_KEY;

// ❌ Bad
const apiKey = 'gsk_your-key-here';
```

**Rotate Keys Regularly:**
- Change API keys every 90 days
- Use different keys for dev/staging/prod
- Revoke old keys immediately

---

## 📝 Summary

**Can you use Cursor Premium API?**
- ❌ **No** - It's for IDE use only, not external applications

**What should you do instead?**
- ✅ Get **direct API keys** from providers
- ✅ Start with **Groq free tier** (14,400 requests/day)
- ✅ Use proper environment variables
- ✅ Follow security best practices

**Quick Start:**
1. Sign up at https://console.groq.com
2. Get API key (free, no credit card)
3. Add to `.env.local`
4. Start using immediately!

---

## 🆘 Need Help?

If you need help setting up any provider:
1. Check the main guide: `LLM_MODEL_RECOMMENDATIONS.md`
2. Provider documentation:
   - Groq: https://console.groq.com/docs
   - OpenAI: https://platform.openai.com/docs
   - Gemini: https://ai.google.dev/docs

---

## ✅ Next Steps

1. **Get Groq API key** (5 minutes)
2. **Add to environment variables**
3. **Implement Groq service** (see `LLM_MODEL_RECOMMENDATIONS.md`)
4. **Test with free tier**
5. **Deploy and monitor usage**

**Estimated Total Time: 20-30 minutes**
