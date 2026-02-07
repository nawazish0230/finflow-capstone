import { UploadService } from './upload.service';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
export declare class UploadController {
    private readonly uploadService;
    constructor(uploadService: UploadService);
    initiate(user: JwtPayload, file: Express.Multer.File | undefined, password?: string): Promise<{
        documentId: string;
        status: string;
    }>;
    getStatus(user: JwtPayload, documentId: string): Promise<{
        status: import("../../common/constants").DocumentProcessingStatus;
        errorMessage: string | undefined;
        transactionCount: number | undefined;
    } | null>;
    listDocuments(user: JwtPayload): Promise<(import("./schemas/document.schema").DocumentUpload & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
}
