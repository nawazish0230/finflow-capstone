import { TransactionsService } from './transactions.service';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { ListTransactionsDto } from './dto/list-transactions.dto';
import type { Request } from 'express';
export declare class TransactionsController {
    private readonly transactionsService;
    constructor(transactionsService: TransactionsService);
    getSummary(user: JwtPayload): Promise<import("./transactions.service").TransactionSummary>;
    list(user: JwtPayload, dto: ListTransactionsDto, req: Request): Promise<{
        items: import("./schemas/transaction.schema").TransactionDocument[];
        total: number;
        page: number;
        limit: number;
    }>;
}
