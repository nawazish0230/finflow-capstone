"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const upload_service_1 = require("./upload.service");
const upload_controller_1 = require("./upload.controller");
const document_schema_1 = require("./schemas/document.schema");
const transactions_module_1 = require("../transactions/transactions.module");
const storage_module_1 = require("./storage/storage.module");
const transaction_parser_service_1 = require("./services/transaction-parser.service");
const user_schema_1 = require("../auth/schemas/user.schema");
let UploadModule = class UploadModule {
};
exports.UploadModule = UploadModule;
exports.UploadModule = UploadModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: document_schema_1.DocumentUpload.name, schema: document_schema_1.DocumentUploadSchema },
                { name: user_schema_1.User.name, schema: user_schema_1.UserSchema },
            ]),
            transactions_module_1.TransactionsModule,
            storage_module_1.StorageModule,
        ],
        controllers: [upload_controller_1.UploadController],
        providers: [upload_service_1.UploadService, transaction_parser_service_1.TransactionParserService],
        exports: [upload_service_1.UploadService, transaction_parser_service_1.TransactionParserService],
    })
], UploadModule);
//# sourceMappingURL=upload.module.js.map