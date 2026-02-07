"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3StorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
let S3StorageService = class S3StorageService {
    config;
    client;
    bucket;
    keyPrefix;
    constructor(config) {
        this.config = config;
        const region = this.config.get('aws.region', 'us-east-1');
        const accessKeyId = this.config.get('aws.credentials.accessKeyId');
        const secretAccessKey = this.config.get('aws.credentials.secretAccessKey');
        this.bucket = this.config.get('aws.s3.bucket', '');
        this.keyPrefix = this.config.get('aws.s3.keyPrefix', 'finflow/documents');
        this.client = new client_s3_1.S3Client({
            region,
            ...(accessKeyId && secretAccessKey
                ? { credentials: { accessKeyId, secretAccessKey } }
                : {}),
        });
    }
    isConfigured() {
        return Boolean(this.bucket);
    }
    async put(key, body, contentType = 'application/pdf') {
        const fullKey = this.keyPrefix ? `${this.keyPrefix}/${key}` : key;
        const command = new client_s3_1.PutObjectCommand({
            Bucket: this.bucket,
            Key: fullKey,
            Body: body,
            ContentType: contentType,
        });
        await this.client.send(command);
        return { key: fullKey, bucket: this.bucket };
    }
    async get(key) {
        const fullKey = this.keyPrefix ? `${this.keyPrefix}/${key}` : key;
        const command = new client_s3_1.GetObjectCommand({
            Bucket: this.bucket,
            Key: fullKey,
        });
        const response = await this.client.send(command);
        const stream = response.Body;
        if (!stream)
            throw new Error('Empty S3 response body');
        const chunks = [];
        for await (const chunk of stream)
            chunks.push(chunk);
        return Buffer.concat(chunks);
    }
    async getPresignedUploadUrl(key, expiresInSeconds = 900) {
        const fullKey = this.keyPrefix ? `${this.keyPrefix}/${key}` : key;
        const command = new client_s3_1.PutObjectCommand({
            Bucket: this.bucket,
            Key: fullKey,
            ContentType: 'application/pdf',
        });
        return (0, s3_request_presigner_1.getSignedUrl)(this.client, command, { expiresIn: expiresInSeconds });
    }
};
exports.S3StorageService = S3StorageService;
exports.S3StorageService = S3StorageService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], S3StorageService);
//# sourceMappingURL=s3-storage.service.js.map