import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

export interface StoragePutResult {
  key: string;
  bucket: string;
}

@Injectable()
export class S3StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly keyPrefix: string;

  constructor(private readonly config: ConfigService) {
    const region = this.config.get<string>('aws.region', 'us-east-1');
    const accessKeyId = this.config.get<string>('aws.credentials.accessKeyId');
    const secretAccessKey = this.config.get<string>('aws.credentials.secretAccessKey');
    this.bucket = this.config.get<string>('aws.s3.bucket', '');
    this.keyPrefix = this.config.get<string>('aws.s3.keyPrefix', 'finflow/documents');

    this.client = new S3Client({
      region,
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {}),
    });
  }

  isConfigured(): boolean {
    return Boolean(this.bucket);
  }

  async put(key: string, body: Buffer, contentType: string = 'application/pdf'): Promise<StoragePutResult> {
    const fullKey = this.keyPrefix ? `${this.keyPrefix}/${key}` : key;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fullKey,
      Body: body,
      ContentType: contentType,
    });
    await this.client.send(command);
    return { key: fullKey, bucket: this.bucket };
  }

  async get(key: string): Promise<Buffer> {
    const fullKey = this.keyPrefix ? `${this.keyPrefix}/${key}` : key;
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: fullKey,
    });
    const response = await this.client.send(command);
    const stream = response.Body as Readable;
    if (!stream) throw new Error('Empty S3 response body');
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
  }

  async getPresignedUploadUrl(key: string, expiresInSeconds: number = 900): Promise<string> {
    const fullKey = this.keyPrefix ? `${this.keyPrefix}/${key}` : key;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fullKey,
      ContentType: 'application/pdf',
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }
}
