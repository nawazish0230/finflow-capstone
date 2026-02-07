"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CorrelationId = void 0;
const common_1 = require("@nestjs/common");
const constants_1 = require("../constants");
exports.CorrelationId = (0, common_1.createParamDecorator)((_data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers[constants_1.CORRELATION_ID_HEADER] ?? request.id;
});
//# sourceMappingURL=correlation-id.decorator.js.map