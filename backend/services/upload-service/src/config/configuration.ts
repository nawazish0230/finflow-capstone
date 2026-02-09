export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  mongodb: {
    uri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/finflow_upload',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '12h',
  },
  upload: {
    maxFileSizeBytes: parseInt(
      process.env.UPLOAD_MAX_FILE_SIZE ?? '10485760',
      10,
    ), // 10MB
    allowedMimeTypes: ['application/pdf'],
    presignedUrlExpirySeconds: parseInt(
      process.env.PRESIGNED_URL_EXPIRY ?? '900',
      10,
    ), // 15 min
  },
  storage: {
    provider: process.env.STORAGE_PROVIDER ?? 'local', // local | s3
    localPath: process.env.STORAGE_LOCAL_PATH ?? './uploads',
  },
  aws: {
    region: process.env.AWS_REGION ?? 'us-east-1',
    s3: {
      bucket: process.env.AWS_S3_BUCKET ?? '',
      keyPrefix: process.env.AWS_S3_KEY_PREFIX ?? 'finflow/documents',
    },
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  },
  cors: {
    origin: process.env.CORS_ORIGIN ?? '*',
  },
  analytics: {
    serviceUrl: process.env.ANALYTICS_SERVICE_URL ?? 'http://localhost:3002',
    internalApiKey: process.env.INTERNAL_API_KEY ?? '',
  },
});
