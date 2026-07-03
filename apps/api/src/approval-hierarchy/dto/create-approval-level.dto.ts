import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class CreateApprovalLevelDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsInt()
  @Min(1)
  order: number;
}
