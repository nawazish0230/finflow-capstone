declare const _default: () => {
    port: number;
    nodeEnv: string;
    mongodb: {
        uri: string;
    };
    jwt: {
        secret: string;
        expiresIn: string;
    };
    upload: {
        maxFileSizeBytes: number;
        allowedMimeTypes: string[];
        presignedUrlExpirySeconds: number;
    };
    storage: {
        provider: string;
        localPath: string;
    };
    aws: {
        region: string;
        s3: {
            bucket: string;
            keyPrefix: string;
        };
        credentials: {
            accessKeyId: string | undefined;
            secretAccessKey: string | undefined;
        };
    };
    cors: {
        origin: string;
    };
};
export default _default;
