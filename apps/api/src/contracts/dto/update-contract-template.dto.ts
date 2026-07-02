import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ContractTemplateStatus } from '@prisma/client';

export class UpdateContractTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  activityType?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  bodyTemplate?: string;

  @IsOptional()
  @IsEnum(ContractTemplateStatus)
  status?: ContractTemplateStatus;
}
