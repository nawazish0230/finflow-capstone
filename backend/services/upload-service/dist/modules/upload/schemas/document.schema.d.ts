import { Document } from 'mongoose';
import type { DocumentProcessingStatus } from '../../../common/constants';
export type DocumentUploadDocument = DocumentUpload & Document;
export declare class DocumentUpload {
    documentId: string;
    userId: string;
    filename: string;
    storageKey: string;
    password?: string | null;
    status: DocumentProcessingStatus;
    errorMessage?: string;
    transactionCount?: number;
}
export declare const DocumentUploadSchema: import("mongoose").Schema<DocumentUpload, import("mongoose").Model<DocumentUpload, any, any, any, (Document<unknown, any, DocumentUpload, any, import("mongoose").DefaultSchemaOptions> & DocumentUpload & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, DocumentUpload, any, import("mongoose").DefaultSchemaOptions> & DocumentUpload & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}), any, DocumentUpload>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, DocumentUpload, Document<unknown, {}, DocumentUpload, {
    id: string;
}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<DocumentUpload & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    documentId?: import("mongoose").SchemaDefinitionProperty<string, DocumentUpload, Document<unknown, {}, DocumentUpload, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<DocumentUpload & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    userId?: import("mongoose").SchemaDefinitionProperty<string, DocumentUpload, Document<unknown, {}, DocumentUpload, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<DocumentUpload & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    filename?: import("mongoose").SchemaDefinitionProperty<string, DocumentUpload, Document<unknown, {}, DocumentUpload, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<DocumentUpload & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    storageKey?: import("mongoose").SchemaDefinitionProperty<string, DocumentUpload, Document<unknown, {}, DocumentUpload, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<DocumentUpload & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    password?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, DocumentUpload, Document<unknown, {}, DocumentUpload, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<DocumentUpload & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<DocumentProcessingStatus, DocumentUpload, Document<unknown, {}, DocumentUpload, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<DocumentUpload & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    errorMessage?: import("mongoose").SchemaDefinitionProperty<string | undefined, DocumentUpload, Document<unknown, {}, DocumentUpload, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<DocumentUpload & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    transactionCount?: import("mongoose").SchemaDefinitionProperty<number | undefined, DocumentUpload, Document<unknown, {}, DocumentUpload, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<DocumentUpload & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, DocumentUpload>;
