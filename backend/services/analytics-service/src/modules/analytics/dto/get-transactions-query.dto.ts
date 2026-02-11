import { IsOptional, IsString, IsIn, IsDateString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { TRANSACTION_CATEGORIES } from '../../../common/constants';

export class GetTransactionsQueryDto {
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
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  pageSize?: number;
}
