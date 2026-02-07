import { AnalyticsService } from './analytics.service';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
export declare class AnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    getCategorySpending(user: JwtPayload): Promise<import("./analytics.service").CategorySpending[]>;
    getMonthlyTrends(user: JwtPayload): Promise<import("./analytics.service").MonthlyTrend[]>;
}
