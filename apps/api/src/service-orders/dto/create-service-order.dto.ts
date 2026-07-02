import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateServiceOrderDto {
  @IsString()
  providerId: string;

  @IsOptional()
  @IsString()
  commercialAgreementId?: string;

  @IsString()
  @MinLength(2)
  description: string;

  @IsNumber()
  @Min(0)
  baseValue: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bonus?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  commission?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  additionals?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reimbursements?: number;
}
