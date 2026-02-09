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
  upload: {
    serviceUrl: process.env.UPLOAD_SERVICE_URL ?? "http://localhost:3002",
  },
});
