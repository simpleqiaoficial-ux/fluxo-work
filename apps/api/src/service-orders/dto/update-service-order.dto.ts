import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

// Usado só pra reenviar uma Ordem de Serviço em ADJUSTMENT_REQUESTED (ou editar
// antes de qualquer decisão, em PENDING_MANAGER_APPROVAL) — nunca em outro status.
export class UpdateServiceOrderDto {
  @IsOptional()
  @IsString()
  commercialAgreementId?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  baseValue?: number;

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
