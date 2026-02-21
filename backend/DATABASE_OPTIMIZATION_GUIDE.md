# Database Optimization Guide

This document outlines MongoDB optimizations for Upload and Analytics services based on the database selection strategy.

## Upload Service Optimizations

### Current Indexes
The Upload Service transaction schema already has optimal indexes:
- `{userId: 1, date: -1}` - Compound index for date-sorted queries
- `{userId: 1, category: 1}` - Compound index for category filtering
- `{userId: 1, documentId: 1}` - Compound index for document-based queries

### Write Optimization Recommendations

#### 1. Write Concern Configuration
For bulk transaction inserts, use `{w: 1}` (acknowledge after primary) for better performance:

```typescript
// In transactions.service.ts
const result = await this.transactionModel.insertMany(docs, {
  writeConcern: { w: 1 }, // Acknowledge after primary write
  ordered: false, // Continue on errors for better performance
});
```

#### 2. Connection Pooling
Optimize MongoDB connection pool for write-heavy workload:

```typescript
// In database.module.ts
MongooseModule.forRootAsync({
  useFactory: (config: ConfigService) => ({
    uri: config.get<string>('mongodb.uri'),
    maxPoolSize: 50, // Increase pool size for concurrent writes
    minPoolSize: 10, // Maintain minimum connections
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  }),
}),
```

#### 3. Bulk Write Optimization
For large document processing, consider batching:

```typescript
// Batch inserts in chunks of 1000
const BATCH_SIZE = 1000;
for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
  const batch = transactions.slice(i, i + BATCH_SIZE);
  await this.transactionModel.insertMany(batch, {
    writeConcern: { w: 1 },
    ordered: false,
  });
}
```

### Read Optimization Recommendations

#### 1. Use Lean Queries
For read-only operations, use `.lean()` to return plain JavaScript objects:

```typescript
const transactions = await this.transactionModel
  .find({ userId })
  .sort({ date: -1 })
  .lean() // Faster, returns plain objects
  .exec();
```

#### 2. Projection for Large Documents
Only select needed fields:

```typescript
const transactions = await this.transactionModel
  .find({ userId }, { description: 1, amount: 1, date: 1 }) // Only select needed fields
  .sort({ date: -1 })
  .lean()
  .exec();
```

## Analytics Service Optimizations

### Current Aggregation Pipeline
The Analytics Service uses MongoDB's `$facet` for parallel aggregations, which is optimal.

### Read Optimization Recommendations

#### 1. Read Replicas
Configure read preference to use secondary nodes for analytics queries:

```typescript
// In database.module.ts
MongooseModule.forRootAsync({
  useFactory: (config: ConfigService) => ({
    uri: config.get<string>('mongodb.uri'),
    readPreference: 'secondaryPreferred', // Read from secondaries when available
  }),
}),
```

#### 2. Aggregation Pipeline Optimization
Ensure `$match` stages come early in the pipeline:

```typescript
// ✅ Good: $match early
await this.transactionModel.aggregate([
  { $match: { userId } }, // Filter first
  { $group: { ... } },
  { $sort: { ... } },
]);

// ❌ Bad: $match late
await this.transactionModel.aggregate([
  { $group: { ... } },
  { $match: { userId } }, // Filter after grouping (inefficient)
]);
```

#### 3. Index Usage Verification
Use `explain()` to verify indexes are being used:

```typescript
const explain = await this.transactionModel
  .aggregate([{ $match: { userId } }, { $group: { ... } }])
  .explain('executionStats');

console.log('Index used:', explain.executionStats.executionStages.indexName);
```

#### 4. Caching Aggregation Results
Cache frequently accessed aggregations (implemented via Redis):

```typescript
// Cache summary for 5 minutes
const cacheKey = `analytics:summary:${userId}`;
const cached = await this.redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const summary = await this.computeSummary(userId);
await this.redis.setex(cacheKey, 300, JSON.stringify(summary));
return summary;
```

### Index Recommendations

#### Existing Indexes (Already Optimal)
- `{userId: 1, date: -1}` - For date-based aggregations
- `{userId: 1, category: 1}` - For category aggregations

#### Additional Considerations
- Monitor slow queries (> 500ms) and add indexes as needed
- Use compound indexes that match query patterns
- Consider partial indexes for common filters:

```typescript
// Partial index for debit transactions only (if most queries filter by type)
TransactionSchema.index(
  { userId: 1, date: -1 },
  { partialFilterExpression: { type: 'debit' } }
);
```

## Chatbot Service Optimizations

### Text Search Indexes
Text indexes have been added to the transaction schema for full-text search:

```typescript
TransactionSchema.index(
  { description: 'text', rawMerchant: 'text' },
  {
    name: 'text_search_index',
    weights: {
      description: 10, // Higher weight for description
      rawMerchant: 5, // Lower weight for merchant
    },
  },
);
```

### Text Search Usage

```typescript
// Text search query
const results = await this.transactionModel.find({
  $text: { $search: 'restaurant food' },
  userId: userId,
}).exec();

// With relevance score
const results = await this.transactionModel
  .find(
    { $text: { $search: 'restaurant food' }, userId },
    { score: { $meta: 'textScore' } }
  )
  .sort({ score: { $meta: 'textScore' } })
  .exec();
```

### Optimization Tips

1. **Combine Text Search with Filters**: Always include `userId` filter with text search
2. **Limit Results**: Use `.limit()` to avoid large result sets
3. **Projection**: Only select needed fields for better performance

## Performance Monitoring

### Key Metrics to Monitor

1. **Query Performance**
   - Average query time (target: < 200ms for reads, < 500ms for aggregations)
   - Slow query log (queries > 500ms)
   - Index usage statistics

2. **Write Performance**
   - Insert throughput (transactions per second)
   - Write latency (target: < 100ms)
   - Bulk insert performance

3. **Database Health**
   - Connection pool utilization
   - Replication lag (for replica sets)
   - Disk I/O and memory usage

### MongoDB Monitoring Tools

1. **MongoDB Atlas**: Built-in monitoring and alerts
2. **MongoDB Compass**: Visual query analysis
3. **mongostat**: Real-time database statistics
4. **db.serverStatus()**: Server status and metrics

## Migration Checklist

### Upload Service
- [x] Indexes optimized
- [ ] Write concern configured
- [ ] Connection pooling tuned
- [ ] Bulk write batching implemented

### Analytics Service
- [x] Aggregation pipeline optimized
- [ ] Read replicas configured
- [ ] Caching implemented (Redis)
- [ ] Slow query monitoring enabled

### Chatbot Service
- [x] Text indexes added
- [ ] Text search queries optimized
- [ ] Result limiting implemented

## Future Considerations

### TimescaleDB for Analytics (Future)
When time-series analytics become primary use case:
- Automatic partitioning by time
- Continuous aggregates (pre-computed rollups)
- Better compression for historical data

### Elasticsearch for Chatbot (Future)
When search becomes core feature:
- Advanced NLP capabilities
- Fuzzy matching and synonyms
- Relevance scoring
- Better conversational query support
