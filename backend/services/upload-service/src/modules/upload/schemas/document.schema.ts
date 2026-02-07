import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import type { DocumentProcessingStatus } from '../../../common/constants';

export type DocumentUploadDocument = DocumentUpload & Document;

@Schema({ timestamps: true })
export class DocumentUpload {
  @Prop({ required: true, unique: true, index: true })
  documentId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  storageKey: string;

  // Optional password for encrypted PDFs (demo purposes only; store securely in real apps)
  @Prop({ type: String, default: null, select: false })
  password?: string | null;

  @Prop({
    required: true,
    enum: ['uploaded', 'extracting', 'completed', 'failed'],
    default: 'uploaded',
  })
  status: DocumentProcessingStatus;

  @Prop({ default: null })
  errorMessage?: string;

  @Prop({ default: null })
  transactionCount?: number;
}

export const DocumentUploadSchema = SchemaFactory.createForClass(DocumentUpload);

DocumentUploadSchema.index({ userId: 1, createdAt: -1 });
