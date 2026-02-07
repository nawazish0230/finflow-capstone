declare enum NodeEnv {
    Development = "development",
    Production = "production",
    Test = "test"
}
export declare class EnvSchema {
    NODE_ENV: NodeEnv;
    PORT: number;
    MONGODB_URI: string;
    JWT_SECRET: string;
}
export declare function validateEnv(config: Record<string, unknown>): EnvSchema;
export {};
