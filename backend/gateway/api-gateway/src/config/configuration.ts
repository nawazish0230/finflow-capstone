export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  jwt: {
    secret: process.env.JWT_SECRET ?? 'change-me-in-production',
  },
  services: {
    auth: process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001',
    upload: process.env.UPLOAD_SERVICE_URL ?? 'http://localhost:3002',
    analytics: process.env.ANALYTICS_SERVICE_URL ?? 'http://localhost:3003',
    chatbot: process.env.CHATBOT_SERVICE_URL ?? 'http://localhost:3004',
  },
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL ?? '60000', 10), // 1 minute in ms
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? '100', 10),
    authMaxRequests: parseInt(
      process.env.RATE_LIMIT_AUTH_MAX_REQUESTS ?? '50',
      10,
    ),
  },
  cors: {
    origin: process.env.CORS_ORIGIN ?? '*',
  },
});
