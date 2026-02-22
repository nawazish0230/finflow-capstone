export default () => {
  // Explicitly use 'postgres' as default, don't fallback to system USER
  const postgresUser = process.env.POSTGRES_USER || "postgres";
  const postgresPassword = process.env.POSTGRES_PASSWORD || "postgres";

  // Log in development to verify what's being used
  if (process.env.NODE_ENV === "development") {
    console.log("[Config] PostgreSQL username:", postgresUser);
    console.log(
      "[Config] PostgreSQL database:",
      process.env.POSTGRES_DATABASE || "finflow_auth"
    );
  }

  return {
    port: parseInt(process.env.PORT ?? "3001", 10),
    nodeEnv: process.env.NODE_ENV ?? "development",
    postgres: {
      host: process.env.POSTGRES_HOST ?? "localhost",
      port: parseInt(process.env.POSTGRES_PORT ?? "5432", 10),
      username: postgresUser,
      password: postgresPassword,
      database: process.env.POSTGRES_DATABASE ?? "finflow_auth",
      ssl: process.env.POSTGRES_SSL ?? "false", // Set to "true" for managed databases (RDS, etc.)
    },
    jwt: {
      secret: process.env.JWT_SECRET ?? "change-me-in-production",
      expiresIn: process.env.JWT_EXPIRES_IN ?? "12h",
    },
    cors: {
      origin: process.env.CORS_ORIGIN ?? "*",
    },
  };
};
