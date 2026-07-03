import { IsOptional, IsString } from 'class-validator';

// Só reposiciona o nó na árvore (nível e/ou pai) — trocar o usuário de um nó é
// remover e recriar, não uma "edição" do mesmo vínculo.
export class UpdateHierarchyAssignmentDto {
  @IsOptional()
  @IsString()
  approvalLevelId?: string;

  @IsOptional()
  @IsString()
  parentId?: string | null;
}
