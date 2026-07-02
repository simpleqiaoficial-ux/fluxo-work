import { IsString, MinLength } from 'class-validator';

export class CreateContractTemplateDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(2)
  activityType: string;

  @IsString()
  @MinLength(10)
  bodyTemplate: string;
}
