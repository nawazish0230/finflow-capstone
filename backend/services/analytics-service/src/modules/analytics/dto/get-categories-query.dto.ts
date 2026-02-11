import { IsOptional, IsIn } from 'class-validator';
import { TRANSACTION_CATEGORIES } from '../../../common/constants';

export class GetTransactionsQueryDto {
  @IsOptional()
  @IsIn([...TRANSACTION_CATEGORIES])
  category?: string;
}
