import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { JwtPayload } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { GetTransactionsQueryDto } from "./dto/get-categories-query.dto";

@Controller("analytics")
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("summary")
  async getSummary(@CurrentUser() user: JwtPayload) {
    return this.analyticsService.getSummary(user.sub);
  }

  @Get("transactions")
  async getTransactions(
    @CurrentUser() user: JwtPayload,
    @Query() query: GetTransactionsQueryDto
  ) {
    return this.analyticsService.getAllTransactions(user.sub, query.category);
  }

  @Get("monthly")
  async getMonthlyExpense(@CurrentUser() user: JwtPayload) {
    return this.analyticsService.getMonthlyExpense(user.sub);
  }
}
