import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
} from 'class-validator';
import { FinancialEntryPriority } from '@prisma/client';

// Só editável em DRAFT ou ADJUSTMENT_REQUESTED (reenvio) — mesmo espírito do
// UpdateServiceOrderDto.
export class UpdateFinancialEntryDto {
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'competencia deve estar no formato AAAA-MM',
  })
  competencia?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  type?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsEnum(FinancialEntryPriority)
  priority?: FinancialEntryPriority;

  @IsOptional()
  @IsString()
  notes?: string;
}
