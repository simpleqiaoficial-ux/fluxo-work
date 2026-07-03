import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsCnpj } from '../../common/is-cnpj.decorator';

export class CreateProviderDto {
  @IsCnpj()
  cnpj: string;

  @IsString()
  @MinLength(2)
  legalName: string;

  @IsOptional()
  @IsString()
  tradeName?: string;

  @IsString()
  @MinLength(2)
  contactName: string;

  @IsString()
  @MinLength(11)
  @MaxLength(14)
  cpf: string;

  @IsOptional()
  @IsString()
  rg?: string;

  @IsOptional()
  @IsObject()
  address?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  responsibleAssignmentId?: string;
}
