"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var LoggingInterceptor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggingInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const common_2 = require("@nestjs/common");
const constants_1 = require("../constants");
const uuid_1 = require("uuid");
let LoggingInterceptor = LoggingInterceptor_1 = class LoggingInterceptor {
    logger = new common_2.Logger(LoggingInterceptor_1.name);
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const correlationId = request.headers[constants_1.CORRELATION_ID_HEADER] ?? (0, uuid_1.v4)();
        request.headers[constants_1.CORRELATION_ID_HEADER] = correlationId;
        request.id = correlationId;
        const { method, url, ip } = request;
        const start = Date.now();
        return next.handle().pipe((0, operators_1.tap)({
            next: () => {
                this.logger.log({
                    correlationId,
                    method,
                    url,
                    ip,
                    durationMs: Date.now() - start,
                });
            },
            error: (err) => {
                this.logger.error({
                    correlationId,
                    method,
                    url,
                    error: err?.message,
                    durationMs: Date.now() - start,
                });
            },
        }));
    }
};
exports.LoggingInterceptor = LoggingInterceptor;
exports.LoggingInterceptor = LoggingInterceptor = LoggingInterceptor_1 = __decorate([
    (0, common_1.Injectable)()
], LoggingInterceptor);
//# sourceMappingURL=logging.interceptor.js.map