import { IsOptional, IsString, MinLength } from 'class-validator';
import { IsCnpj } from '../../common/is-cnpj.decorator';

export class CreateCompanyDto {
  @IsString()
  @MinLength(2)
  legalName: string;

  @IsOptional()
  @IsString()
  tradeName?: string;

  @IsCnpj()
  cnpj: string;
}
