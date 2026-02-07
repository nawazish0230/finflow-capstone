"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IS_PUBLIC_KEY = void 0;
exports.Public = Public;
const common_1 = require("@nestjs/common");
exports.IS_PUBLIC_KEY = 'isPublic';
function Public() {
    return (0, common_1.SetMetadata)(exports.IS_PUBLIC_KEY, true);
}
//# sourceMappingURL=public.decorator.js.map