import { IsOptional, IsString, IsIn, IsDateString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { TRANSACTION_CATEGORIES } from '../../../common/constants';
import { PAGINATION } from '../../../common/constants';

export class ListTransactionsDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = PAGINATION.DEFAULT_PAGE;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(PAGINATION.MAX_LIMIT)
  limit?: number = PAGINATION.DEFAULT_LIMIT;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn([...TRANSACTION_CATEGORIES])
  category?: string;

  @IsOptional()
  @IsIn(['debit', 'credit'])
  type?: 'debit' | 'credit';

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
