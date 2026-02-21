# Database Design Documentation

## 1. Database Overview

The Finflow backend uses **MongoDB** as the primary database, with **4 separate databases** (one per microservice) following microservices best practices.

| Service | Database Name | Purpose |
|---------|--------------|---------|
| Auth Service | `finflow_auth` | User authentication and authorization |
| Upload Service | `finflow_upload` | Document storage metadata and transaction source of truth |
| Analytics Service | `finflow_analytics` | Transaction read model/projection for analytics |
| Chatbot Service | `finflow_chatbot` | Transaction read model/projection for chatbot |

## 2. Database Schema Details

### 2.1 Auth Service Database (`finflow_auth`)

#### Collection: `users`

```typescript
{
  _id: ObjectId,
  email: string,           // unique, indexed, lowercase, trimmed
  password: string,        // bcrypt hashed, select: false
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `email`: Unique index

**Constraints:**
- Email must be unique
- Email is stored in lowercase
- Password is hashed using bcrypt (cost factor: 10)
- Password is excluded from queries by default (`select: false`)

---

### 2.2 Upload Service Database (`finflow_upload`)

#### Collection: `documentuploads`

```typescript
{
  _id: ObjectId,
  documentId: string,      // UUID, unique, indexed
  userId: string,           // indexed, references users._id
  filename: string,
  storageKey: string,       // S3 object key
  password?: string | null, // optional, for encrypted PDFs
  status: 'uploaded' | 'extracting' | 'completed' | 'failed',
  errorMessage?: string,
  transactionCount?: number,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `documentId`: Unique index
- `userId + createdAt`: Compound index (descending)

**Status Flow:**
1. `uploaded` → Document uploaded to S3, record created
2. `extracting` → PDF parsing in progress
3. `completed` → Transactions extracted successfully
4. `failed` → Error occurred during processing

#### Collection: `transactions` (Source of Truth)

```typescript
{
  _id: ObjectId,
  userId: string,           // indexed, references users._id
  documentId: string,       // indexed, references documentuploads.documentId
  date: Date,               // indexed
  description: string,
  amount: number,
  type: 'debit' | 'credit',
  category: 'Food' | 'Travel' | 'Shopping' | 'Bills' | 
            'Entertainment' | 'OnlinePayments' | 'Others',
  rawMerchant?: string | null,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `userId + date`: Compound index (descending) - for date-sorted queries
- `userId + category`: Compound index - for category filtering
- `userId + documentId`: Compound index - for document-based queries

**Category Enum:**
- `Food`
- `Travel`
- `Shopping`
- `Bills`
- `Entertainment`
- `OnlinePayments`
- `Others`

---

### 2.3 Analytics Service Database (`finflow_analytics`)

#### Collection: `transactions` (Read Model/Projection)

```typescript
{
  _id: ObjectId,            // Same as upload-service transaction._id
  userId: string,           // indexed
  documentId: string,        // indexed
  date: Date,               // indexed
  description: string,
  amount: number,
  type: 'debit' | 'credit',
  category: string,         // indexed
  rawMerchant?: string | null,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:** Same as Upload Service transactions

**Purpose:**
- Fast analytics queries without hitting upload-service
- Optimized for aggregations (category spending, monthly trends)
- Eventual consistency via Kafka events

**Sync Mechanism:**
- Kafka consumer listens to `transactions.created` topic
- Upserts transactions using `_id` as key
- No direct database connection to upload-service

---

### 2.4 Chatbot Service Database (`finflow_chatbot`)

#### Collection: `transactions` (Read Model/Projection)

```typescript
{
  _id: ObjectId,            // Same as upload-service transaction._id
  userId: string,           // indexed
  documentId: string,        // indexed
  date: Date,               // indexed
  description: string,
  amount: number,
  type: 'debit' | 'credit',
  category: string,         // indexed
  rawMerchant?: string | null,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:** Same as Upload Service transactions

**Purpose:**
- Fast chatbot queries without hitting upload-service
- Optimized for natural language query processing
- Eventual consistency via Kafka events

**Sync Mechanism:**
- Kafka consumer listens to `transactions.created` topic
- Upserts transactions using `_id` as key
- No direct database connection to upload-service

---

## 3. Database Connection Strings

Each service connects to its own MongoDB database:

```env
# Auth Service
MONGODB_URI=mongodb://localhost:27017/finflow_auth

# Upload Service
MONGODB_URI=mongodb://localhost:27017/finflow_upload

# Analytics Service
MONGODB_URI=mongodb://localhost:27017/finflow_analytics

# Chatbot Service
MONGODB_URI=mongodb://localhost:27017/finflow_chatbot
```

## 4. Data Consistency Model

### Write Model (Upload Service)
- **Single Source of Truth**: All transactions are written to `finflow_upload.transactions`
- **ACID Properties**: MongoDB transactions ensure consistency
- **Immediate Consistency**: Write operations are immediately available

### Read Models (Analytics & Chatbot Services)
- **Eventual Consistency**: Data replicated via Kafka events
- **Lag**: Typically < 1 second, depends on Kafka processing speed
- **Idempotency**: Upsert operations ensure no duplicates
- **Failure Handling**: Consumer retries failed messages

## 5. Query Patterns

### Upload Service Queries
- **Document Status**: `findOne({ documentId })`
- **User Documents**: `find({ userId }).sort({ createdAt: -1 })`
- **Transaction Summary**: Aggregation pipeline on `transactions` collection

### Analytics Service Queries
- **Summary**: Aggregation with `$group` by userId
- **Category Spending**: `$group` by category, include transactions
- **Monthly Trends**: `$group` by year/month, calculate totals
- **Transaction List**: `find({ userId, ...filters }).sort({ date: -1 }).skip().limit()`

### Chatbot Service Queries
- **User Transactions**: `find({ userId, date: { $gte, $lte } })`
- **Category Filtering**: `find({ userId, category })`
- **Amount Aggregations**: `aggregate([{ $match }, { $group: { $sum: '$amount' } }])`

## 6. Data Migration & Backup Strategy

### Backup
- Each database should be backed up independently
- Transaction projections (Analytics/Chatbot) can be rebuilt from Kafka events

### Migration
- Schema changes in Upload Service require:
  1. Update Transaction schema
  2. Update TransactionCreatedEvent interface
  3. Update consumer logic in Analytics/Chatbot services
  4. Replay events if needed (from Kafka or source DB)

## 7. Performance Considerations

### Indexes
- All `userId` queries are indexed
- Compound indexes optimize common query patterns
- Date-based queries use descending index for recent-first sorting

### Aggregations
- Analytics aggregations run on local projection (fast)
- No cross-service database calls
- MongoDB aggregation pipeline optimized for analytics workloads

### Scalability
- Each service can scale its database independently
- Read models (Analytics/Chatbot) can be scaled horizontally
- Kafka partitions allow parallel consumption
