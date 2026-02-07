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
exports.DocumentUploadSchema = exports.DocumentUpload = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let DocumentUpload = class DocumentUpload {
    documentId;
    userId;
    filename;
    storageKey;
    password;
    status;
    errorMessage;
    transactionCount;
};
exports.DocumentUpload = DocumentUpload;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], DocumentUpload.prototype, "documentId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], DocumentUpload.prototype, "userId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], DocumentUpload.prototype, "filename", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], DocumentUpload.prototype, "storageKey", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, select: false }),
    __metadata("design:type", Object)
], DocumentUpload.prototype, "password", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: true,
        enum: ['uploaded', 'extracting', 'completed', 'failed'],
        default: 'uploaded',
    }),
    __metadata("design:type", String)
], DocumentUpload.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: null }),
    __metadata("design:type", String)
], DocumentUpload.prototype, "errorMessage", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: null }),
    __metadata("design:type", Number)
], DocumentUpload.prototype, "transactionCount", void 0);
exports.DocumentUpload = DocumentUpload = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], DocumentUpload);
exports.DocumentUploadSchema = mongoose_1.SchemaFactory.createForClass(DocumentUpload);
exports.DocumentUploadSchema.index({ userId: 1, createdAt: -1 });
//# sourceMappingURL=document.schema.js.map