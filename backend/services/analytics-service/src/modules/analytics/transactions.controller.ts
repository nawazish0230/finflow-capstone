import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { GetTransactionsQueryDto } from './dto/get-transactions-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { TransactionCategory } from '../../common/constants';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  async getTransactions(
    @CurrentUser() user: JwtPayload,
    @Query() query: GetTransactionsQueryDto,
  ) {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    return this.analyticsService.getTransactionsPaginated(user.sub, {
      search: query.search,
      category: query.category as TransactionCategory | undefined,
      type: query.type,
      startDate,
      endDate,
      page: query.page,
      pageSize: query.pageSize,
    });
  }
}
