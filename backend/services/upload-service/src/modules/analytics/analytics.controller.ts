import { Controller, Get, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('categories')
  async getCategorySpending(@CurrentUser() user: JwtPayload) {
    return this.analyticsService.getCategorySpending(user.sub);
  }

  @Get('monthly-trends')
  async getMonthlyTrends(@CurrentUser() user: JwtPayload) {
    return this.analyticsService.getMonthlyTrends(user.sub);
  }
}
