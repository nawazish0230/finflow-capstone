export default () => ({
  port: parseInt(process.env.PORT ?? "3002", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  mongodb: {
    uri:
      process.env.MONGODB_URI ?? "mongodb://localhost:27017/finflow_analytics",
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? "change-me-in-production",
    expiresIn: process.env.JWT_EXPIRES_IN ?? "12h",
  },
  internal: {
    apiKey: process.env.INTERNAL_API_KEY ?? "",
  },
  kafka: {
    brokers: (process.env.KAFKA_BROKERS ?? "localhost:9092").split(","),
    clientId: process.env.KAFKA_CLIENT_ID ?? "analytics-service",
    transactionsTopic: process.env.KAFKA_TRANSACTIONS_TOPIC ?? "transactions.created",
  },
});
