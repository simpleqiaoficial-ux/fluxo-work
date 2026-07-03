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

export class CreateFinancialEntryDto {
  @IsString()
  providerId: string;

  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'competencia deve estar no formato AAAA-MM',
  })
  competencia: string;

  @IsString()
  @MinLength(2)
  type: string;

  @IsString()
  @MinLength(2)
  description: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsDateString()
  expectedDate: string;

  @IsDateString()
  dueDate: string;

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
