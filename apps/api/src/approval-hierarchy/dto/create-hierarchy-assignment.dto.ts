import { IsOptional, IsString } from 'class-validator';

export class CreateHierarchyAssignmentDto {
  @IsString()
  approvalLevelId: string;

  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}
