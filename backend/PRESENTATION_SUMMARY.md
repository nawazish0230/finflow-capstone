# Finflow Architecture - Presentation Summary

## Quick Reference for Interviews & Presentations

---

## 1. Executive Summary

**Finflow** is a financial transaction analytics platform that processes PDF bank statements, extracts transactions, and provides insights through analytics and an AI chatbot.

**Key Metrics:**
- 4 Microservices
- 4 MongoDB Databases
- Event-Driven Architecture (Kafka)
- 99.9% Availability Target
- Horizontal Scalability

---

## 2. Architecture Overview (30-Second Pitch)

```
React Native/Web App
    ↓
API Gateway (Kong/AWS)
    ↓
4 Microservices (Auth, Upload, Analytics, Chatbot)
    ↓
Kafka (Event Broker)
    ↓
4 MongoDB Databases (One per Service)
    ↓
AWS S3 (Document Storage)
```

**Key Pattern:** Event-Driven Microservices with CQRS

---

## 3. Answer to All 16 Questions (Quick Reference)

### Q1: Functional vs Non-Functional Requirements

**Functional:**
- User auth, PDF upload, Transaction extraction, Analytics, Chatbot

**Non-Functional:**
- Performance (< 200ms API), Scalability (1000+ users), Availability (99.9%), Security (JWT, HTTPS), Observability (Prometheus, Grafana)

---

### Q2: System Architecture Elaboration

**Layers:**
1. **Client**: React Native (Mobile) + Web
2. **API Gateway**: Routing, Rate Limiting, SSL
3. **Load Balancer**: Health checks, Multi-AZ
4. **Services**: 4 microservices with auto-scaling
5. **Message Broker**: Kafka (3 brokers, replication factor 3)
6. **Databases**: MongoDB Replica Sets (Primary + 2 Secondaries)
7. **Cache**: Redis Cluster
8. **Storage**: AWS S3

**Communication:**
- **Synchronous**: REST APIs (Client ↔ Services, Services ↔ Auth)
- **Asynchronous**: Kafka Events (Upload → Analytics/Chatbot)

---

### Q3: Why MongoDB Not SQL?

**Reasons:**
1. Schema flexibility (frequent changes)
2. Analytics performance (aggregation pipeline)
3. Horizontal scaling (native sharding)
4. Document model fits transactions
5. Faster development (no migrations)

**Trade-off:** No ACID across collections (mitigated with single-doc transactions)

---

### Q4: Why Multiple Databases?

**Database per Service Pattern:**
- **Independence**: Each service evolves independently
- **Performance Isolation**: Analytics queries don't impact uploads
- **Fault Isolation**: One DB failure doesn't affect others
- **Scaling**: Scale each DB independently
- **Team Autonomy**: Different teams manage their DBs

**Sync:** Kafka events ensure eventual consistency

---

### Q5: Why Not PostgreSQL for Auth?

**Decision:** MongoDB for consistency across stack

**Reasons:**
1. Simple schema (no complex relationships)
2. Operational consistency (same tech stack)
3. Better horizontal scaling
4. Team expertise

**PostgreSQL would be better for:** Complex RBAC, ACID transactions, existing SQL infrastructure

---

### Q6: Service Decomposition Decision

**Strategy:** Domain-Driven Design (DDD)

**Bounded Contexts:**
- **Auth Context**: Authentication/Authorization
- **Upload Context**: Document processing
- **Analytics Context**: Financial insights
- **Chatbot Context**: Conversational interface

**Principles:**
- Single Responsibility
- Data Ownership
- Scalability Requirements
- Team Structure

---

### Q7: Architecture Patterns (4 Patterns)

1. **Microservices Architecture**
   - Independent services, own databases, REST APIs

2. **Event-Driven Architecture (EDA)**
   - Kafka for async communication, loose coupling

3. **CQRS (Command Query Responsibility Segregation)**
   - Write model (Upload), Read models (Analytics/Chatbot)

4. **Database per Service**
   - Each service owns its database, sync via events

---

### Q8: Client Layer - Web Included

**Clients:**
- ✅ React Native App (Mobile - iOS/Android)
- ✅ Web Application (React/Next.js) - Future
- ✅ API Gateway supports both

**Rationale:** Organization needs web support for admin/enterprise users

---

### Q9: Pre-Commit Checks (Lint)

**Implementation:**
- Husky + lint-staged
- ESLint + Prettier
- TypeScript compilation
- Unit tests
- Build verification

**CI Pipeline:**
- Lint → Test → Build → Security Scan → Deploy

---

### Q10: Branching Strategy

**Git Flow:**
```
main (production)
  ↑
release/* (staging)
  ↑
develop (integration)
  ↑
feature/* (development)
hotfix/* (urgent fixes)
```

**Protection:**
- `main`: Require PR reviews, status checks
- Auto-merge after CI passes

---

### Q11: Environment Configuration

**Environments:**
- **Development**: Local, hot reload
- **Staging**: Pre-production testing
- **Production**: Live, high availability

**Config Management:**
- Environment variables
- Secrets management (AWS Secrets Manager)
- Config validation

---

### Q12: SonarQube Integration

**Quality Gates:**
- Code Coverage: > 80%
- Duplicated Lines: < 3%
- Maintainability: A
- Reliability: A
- Security: A

**CI Integration:** Automated scans on PR

---

### Q13: Kubernetes & Docker

**Docker:**
- Multi-stage builds
- Alpine images (smaller)
- Health checks

**Kubernetes:**
- Deployments with replicas
- HPA (Horizontal Pod Autoscaler)
- Service mesh (Istio) - Future
- ConfigMaps & Secrets

---

### Q14: MVP vs Full Product

**MVP (8-12 weeks):**
- ✅ Core functionality
- ✅ Basic security
- ✅ Single region
- ✅ Manual scaling

**Full Product (6-12 months):**
- Advanced analytics
- Multi-region
- Auto-scaling
- Comprehensive monitoring
- Mobile app
- Enterprise features

**Decision Framework:** User value, time to market, technical risk, resources

---

### Q15: Non-Functional Requirements

#### Monitoring & Observability
- **Prometheus**: Metrics collection
- **Grafana**: Dashboards & visualization
- **CloudWatch**: Logs & AWS metrics
- **Application Logging**: Structured JSON logs
- **Distributed Tracing**: OpenTelemetry/Jaeger
- **Accessibility**: WCAG 2.1 AA compliance

#### Security & Performance
- **JWT**: 12h expiration, refresh tokens
- **Input Validation**: class-validator, sanitization
- **HTTPS/TLS**: SSL certificates, TLS 1.3
- **Rate Limiting**: Redis-based, per-user/IP

#### Caching & Optimization
- **Redis**: Session cache, query cache, rate limiting
- **Cache Strategy**: TTL-based, invalidation on updates
- **Query Optimization**: Indexes, aggregation pipelines

#### Scalability
- **Load Balancer**: API Gateway level (recommended)
- **Auto Scaling**: Kubernetes HPA (CPU/Memory/Request rate)
- **Database Sharding**: By userId (when needed)

#### Availability (99.9%)
- **Multi-AZ**: Services across 3 availability zones
- **Database Replication**: Primary + 2 Secondaries
- **Circuit Breaker**: Prevents cascading failures
- **Health Checks**: Liveness/Readiness probes
- **Retry Mechanisms**: Exponential backoff
- **Graceful Degradation**: Fallback responses

**Patterns for Uptime:**
- Circuit Breaker
- Retry with backoff
- Health checks
- Multi-AZ deployment
- Database replication
- Kafka high availability

---

### Q16: REST vs GraphQL

**REST for:**
- ✅ Simple CRUD operations
- ✅ File uploads
- ✅ Caching
- ✅ Auth routes (simpler, more secure)

**GraphQL for:**
- Complex queries (multiple resources)
- Mobile optimization (fetch only needed fields)
- Real-time subscriptions
- Rapid frontend development

**Auth Routes: REST (Recommended)**
- Simpler security (rate limiting, IP restrictions)
- Standard protocols (OAuth2, JWT)
- Industry standard (Auth0, Firebase)
- No caching needed for auth

**Hybrid Approach:**
- Auth: REST
- Data Queries: GraphQL (future)
- File Uploads: REST

---

## 4. Key Interview Questions & Answers

### Architecture Questions

**Q: Why microservices over monolith?**
- Independent scaling, team autonomy, fault isolation, deployment independence

**Q: How do you handle data consistency?**
- Eventual consistency via Kafka, idempotent operations, < 1s lag tolerance

**Q: What if Kafka goes down?**
- HA setup (3 brokers), producer retries, consumer lag monitoring, fallback to direct queries

**Q: How do you ensure 99.9% availability?**
- Multi-AZ, database replication, health checks, circuit breaker, retry mechanisms

**Q: How to scale to 1M users?**
- Horizontal scaling, database sharding, Kafka partitions, Redis cluster, CDN, multi-region

### Design Pattern Questions

**Q: Explain CQRS pattern**
- Write model (Upload) optimized for writes, Read models (Analytics/Chatbot) optimized for reads, sync via Kafka

**Q: Why event-driven?**
- Loose coupling, scalability, resilience, flexibility, async processing

### Database Questions

**Q: Why MongoDB?**
- Schema flexibility, analytics performance, horizontal scaling, document model, faster development

**Q: Database migrations?**
- Mongoose handles evolution, versioned events for breaking changes, scripts for data migration, zero-downtime deployment

### Performance Questions

**Q: Optimize slow queries?**
- Indexing, query analysis, caching, pagination, aggregation optimization, read replicas

**Q: PDF processing performance?**
- Async processing, worker pool, caching, streaming, timeout limits, queue system

### Security Questions

**Q: Secure JWT tokens?**
- HTTPS only, short expiration, token blacklisting (Redis), signature verification, token rotation

**Q: Prevent SQL injection?**
- Parameterized queries (Mongoose), input validation, no raw queries, sanitization, least privilege

---

## 5. Improvement Roadmap

### Immediate (Next Sprint)
1. ✅ Redis Caching (2-3 days)
2. ✅ Rate Limiting (1-2 days)
3. ✅ Comprehensive Logging (2-3 days)
4. ✅ Health Check Enhancements (1 day)

### Short-Term (Next Month)
1. Circuit Breaker (3-4 days)
2. Distributed Tracing (4-5 days)
3. Prometheus Metrics (3-4 days)
4. Grafana Dashboards (2-3 days)
5. Refresh Tokens (2-3 days)

### Medium-Term (Next Quarter)
1. Database Sharding (1-2 weeks)
2. Multi-Region Deployment (2-3 weeks)
3. Advanced Analytics (3-4 weeks)
4. LLM Integration (2-3 weeks)
5. Mobile App (6-8 weeks)

### Long-Term (6+ Months)
1. Bank Account Integration (4-6 weeks)
2. Multi-Currency Support (2-3 weeks)
3. Advanced RBAC (3-4 weeks)
4. Compliance (SOC 2, GDPR) (2-3 months)

---

## 6. Technology Stack Summary

**Backend:**
- NestJS (TypeScript)
- MongoDB (Mongoose)
- Kafka (kafkajs)
- Redis
- AWS S3

**Frontend:**
- React Native (Expo)
- Zustand (State Management)
- React Navigation
- Chart Kit

**Infrastructure:**
- Docker
- Kubernetes
- AWS (S3, CloudWatch)
- GitHub Actions (CI/CD)

**Monitoring:**
- Prometheus (Metrics)
- Grafana (Dashboards)
- CloudWatch (Logs)
- SonarQube (Code Quality)

---

## 7. Key Metrics & SLAs

**Performance:**
- API Response Time: < 200ms (p95)
- Analytics Queries: < 500ms
- PDF Processing: < 30 seconds

**Availability:**
- Target: 99.9% (8.76 hours downtime/year)
- Current: Monitoring in place

**Scalability:**
- Concurrent Users: 1000+ (current), 1M+ (target)
- Auto-scaling: Enabled (Kubernetes HPA)

**Security:**
- JWT Expiration: 12 hours
- Rate Limiting: 100 req/min per user
- HTTPS: Enforced

---

## 8. Presentation Tips

### Slide Structure (30-45 minutes)

1. **Introduction** (2 min)
   - Problem statement
   - Solution overview

2. **Architecture** (10 min)
   - High-level diagram
   - Service responsibilities
   - Communication patterns

3. **Design Decisions** (10 min)
   - Why microservices?
   - Why MongoDB?
   - Why multiple databases?
   - Architecture patterns

4. **Non-Functional Requirements** (8 min)
   - Scalability
   - Availability
   - Security
   - Monitoring

5. **Implementation Details** (5 min)
   - Key technologies
   - Database design
   - Event flow

6. **Improvements & Roadmap** (5 min)
   - Immediate improvements
   - Future enhancements

7. **Q&A** (5-10 min)

### Key Points to Emphasize

1. **Event-Driven Architecture**: Scalable, decoupled
2. **CQRS Pattern**: Optimized read/write models
3. **Database per Service**: Independence, fault isolation
4. **99.9% Availability**: Multi-AZ, replication, circuit breaker
5. **Scalability**: Horizontal scaling, auto-scaling, sharding

### Common Follow-up Questions

- "How would you handle a database failure?"
- "What if Kafka consumer lag increases?"
- "How do you ensure data consistency?"
- "What's your disaster recovery plan?"
- "How do you monitor system health?"

---

## 9. Quick Reference Card

### Service Ports
- Auth: 3001
- Upload: 3000
- Analytics: 3002
- Chatbot: 3003

### Databases
- finflow_auth
- finflow_upload
- finflow_analytics
- finflow_chatbot

### Kafka Topic
- transactions.created

### Key Patterns
1. Microservices
2. Event-Driven (EDA)
3. CQRS
4. Database per Service

### Key Technologies
- NestJS, TypeScript, MongoDB, Kafka, Redis, AWS S3, Kubernetes

---

## 10. Conclusion

**Finflow** demonstrates:
- ✅ Modern microservices architecture
- ✅ Event-driven design for scalability
- ✅ CQRS for performance optimization
- ✅ Comprehensive NFR coverage
- ✅ Production-ready patterns and practices

**Ready for:**
- ✅ Horizontal scaling
- ✅ High availability
- ✅ Enterprise deployment
- ✅ Future enhancements

---

*This document serves as a quick reference for interviews and presentations. For detailed explanations, refer to `ARCHITECTURE_INTERVIEW_GUIDE.md`*

GPT-4 Vision (OpenAI) — best overall
Reads PDFs directly (no text extraction needed)
Handles scanned PDFs with built-in OCR
Understands complex layouts and tables
Cost: ~$0.01-0.03 per page
Claude 3 Opus Vision (Anthropic) — best for long documents
200K token context (handles very long PDFs)
Excellent OCR and table extraction
Cost: ~$0.015 per page
Google Gemini Pro Vision — best value
Free tier: 60 requests/minute
Good OCR and layout understanding
Cost: Free tier or ~$0.001 per page
Groq (Llama 3.3 70B) — best for text PDFs (already integrated)
Very fast (~200-500ms)
Cost-effective (~$0.0001 per request)
No vision (needs text extraction first)
Already implemented as fallback
