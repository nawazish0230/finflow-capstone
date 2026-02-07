import { ConfigService } from '@nestjs/config';
export interface StoragePutResult {
    key: string;
    bucket: string;
}
export declare class S3StorageService {
    private readonly config;
    private readonly client;
    private readonly bucket;
    private readonly keyPrefix;
    constructor(config: ConfigService);
    isConfigured(): boolean;
    put(key: string, body: Buffer, contentType?: string): Promise<StoragePutResult>;
    get(key: string): Promise<Buffer>;
    getPresignedUploadUrl(key: string, expiresInSeconds?: number): Promise<string>;
}
