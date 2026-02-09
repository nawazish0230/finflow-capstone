import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { UploadClientService } from '../upload-client/upload-client.service';
import { GetTransactionsQueryDto } from './dto/get-transactions-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { Request } from 'express';
import type { TransactionCategory } from '../../common/constants';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly uploadClient: UploadClientService) {}

  @Get()
  async getTransactions(
    @CurrentUser() user: JwtPayload,
    @Query() query: GetTransactionsQueryDto,
    @Req() req: Request,
  ) {
    const authToken = req.headers.authorization?.replace('Bearer ', '') || '';
    
    const result = await this.uploadClient.listTransactions(user.sub, authToken, {
      search: query.search,
      category: query.category as TransactionCategory | undefined,
      type: query.type,
      dateFrom: query.startDate,
      dateTo: query.endDate,
      page: query.page,
      limit: query.pageSize,
    });

    return {
      data: result.items,
      total: result.total,
      page: result.page,
      pageSize: result.limit,
      totalPages: Math.ceil(result.total / result.limit) || 1,
    };
  }
}
