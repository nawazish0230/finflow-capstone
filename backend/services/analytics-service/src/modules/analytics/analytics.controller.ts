import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { Request } from 'express';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  async getSummary(@CurrentUser() user: JwtPayload, @Req() req: Request) {
    const authToken = req.headers.authorization?.replace('Bearer ', '') || '';
    return this.analyticsService.getSummary(user.sub, authToken);
  }

  @Get('categories')
  async getCategories(@CurrentUser() user: JwtPayload, @Req() req: Request) {
    const authToken = req.headers.authorization?.replace('Bearer ', '') || '';
    return this.analyticsService.getCategorySpending(user.sub, authToken);
  }

  @Get('monthly')
  async getMonthly(@CurrentUser() user: JwtPayload, @Req() req: Request) {
    const authToken = req.headers.authorization?.replace('Bearer ', '') || '';
    return this.analyticsService.getMonthlyTrends(user.sub, authToken);
  }
}
