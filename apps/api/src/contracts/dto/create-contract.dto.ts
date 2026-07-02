import { IsString } from 'class-validator';

export class CreateContractDto {
  @IsString()
  templateId: string;
}
