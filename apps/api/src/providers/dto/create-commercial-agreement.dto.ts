import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { AgreementType } from '@prisma/client';

export class CreateCommercialAgreementDto {
  @IsEnum(AgreementType)
  type: AgreementType;

  @IsNumber()
  @Min(0)
  baseRate: number;

  @IsString()
  @MinLength(2)
  scopeDescription: string;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
