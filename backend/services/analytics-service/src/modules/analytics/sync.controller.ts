import { BadRequestException, Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { SyncTransactionsDto } from './dto/sync-transactions.dto';
import { Public } from '../../common/decorators/public.decorator';
import { InternalApiGuard } from '../../common/guards/internal-api.guard';

@Controller('internal')
@Public()
@UseGuards(InternalApiGuard)
export class SyncController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('analytics/categories')
  async getCategorySpending(@Query('userId') userId: string) {
    if (!userId) throw new BadRequestException('userId required');
    return this.analyticsService.getCategorySpending(userId);
  }

  @Get('analytics/monthly-trends')
  async getMonthlyTrends(@Query('userId') userId: string) {
    if (!userId) throw new BadRequestException('userId required');
    return this.analyticsService.getMonthlyTrends(userId);
  }

  @Post('sync/transactions')
  async syncTransactions(@Body() dto: SyncTransactionsDto) {
    const count = await this.analyticsService.syncTransactions(
      dto.userId,
      dto.documentId,
      dto.transactions.map((t) => ({
        date: new Date(t.date),
        description: t.description,
        amount: t.amount,
        type: t.type,
        category: t.category,
        rawMerchant: t.rawMerchant,
      })),
    );
    return { synced: count };
  }
}
