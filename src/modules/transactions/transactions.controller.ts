import { Controller, Get, Query, Req } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { ListTransactionsDto } from './dto/list-transactions.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import type { Request } from 'express';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get('summary')
  async getSummary(@CurrentUser() user: JwtPayload) {
    return this.transactionsService.getSummary(user.sub);
  }

  @Get()
  async list(
    @CurrentUser() user: JwtPayload,
    @Query() dto: ListTransactionsDto,
    @Req() req: Request,
  ) {
    const result = await this.transactionsService.list(user.sub, dto);
    (req as Request & { paginationMeta?: { page: number; limit: number; total: number } }).paginationMeta = {
      page: result.page,
      limit: result.limit,
      total: result.total,
    };
    return result;
  }
}
