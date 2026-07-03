import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { HierarchyAssignment } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHierarchyAssignmentDto } from './dto/create-hierarchy-assignment.dto';
import { UpdateHierarchyAssignmentDto } from './dto/update-hierarchy-assignment.dto';

@Injectable()
export class HierarchyAssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(
    companyId: string,
    actorUserId: string,
    dto: CreateHierarchyAssignmentDto,
    ip?: string,
  ) {
    await this.assertLevelBelongsToCompany(companyId, dto.approvalLevelId);
    await this.assertUserBelongsToCompany(companyId, dto.userId);
    if (dto.parentId) {
      await this.assertAssignmentBelongsToCompany(companyId, dto.parentId);
    }

    const assignment = await this.prisma.hierarchyAssignment.create({
      data: {
        companyId,
        approvalLevelId: dto.approvalLevelId,
        userId: dto.userId,
        parentId: dto.parentId,
      },
    });

    await this.audit.record({
      action: 'hierarchyAssignment.created',
      entityType: 'HierarchyAssignment',
      entityId: assignment.id,
      companyId,
      actorUserId,
      after: {
        approvalLevelId: assignment.approvalLevelId,
        userId: assignment.userId,
        parentId: assignment.parentId,
      },
      ip,
    });

    return assignment;
  }

  findAll(companyId: string) {
    return this.prisma.hierarchyAssignment.findMany({
      where: { companyId },
      include: { approvalLevel: true, user: true },
    });
  }

  async findById(companyId: string, id: string) {
    const assignment = await this.prisma.hierarchyAssignment.findFirst({
      where: { id, companyId },
    });
    if (!assignment) {
      throw new NotFoundException('Vínculo na hierarquia não encontrado');
    }
    return assignment;
  }

  async update(
    companyId: string,
    id: string,
    actorUserId: string,
    dto: UpdateHierarchyAssignmentDto,
    ip?: string,
  ) {
    const before = await this.findById(companyId, id);

    if (dto.approvalLevelId !== undefined) {
      await this.assertLevelBelongsToCompany(companyId, dto.approvalLevelId);
    }

    let nextParentId = before.parentId;
    if (dto.parentId !== undefined) {
      if (dto.parentId === null) {
        nextParentId = null;
      } else {
        await this.assertAssignmentBelongsToCompany(companyId, dto.parentId);
        await this.assertNoCycle(companyId, id, dto.parentId);
        nextParentId = dto.parentId;
      }
    }

    const assignment = await this.prisma.hierarchyAssignment.update({
      where: { id },
      data: {
        approvalLevelId: dto.approvalLevelId,
        parentId: nextParentId,
      },
    });

    await this.audit.record({
      action: 'hierarchyAssignment.updated',
      entityType: 'HierarchyAssignment',
      entityId: id,
      companyId,
      actorUserId,
      before: {
        approvalLevelId: before.approvalLevelId,
        parentId: before.parentId,
      },
      after: {
        approvalLevelId: assignment.approvalLevelId,
        parentId: assignment.parentId,
      },
      ip,
    });

    return assignment;
  }

  async remove(
    companyId: string,
    id: string,
    actorUserId: string,
    ip?: string,
  ) {
    await this.findById(companyId, id);

    const hasChildren = await this.prisma.hierarchyAssignment.findFirst({
      where: { parentId: id },
    });
    if (hasChildren) {
      throw new ConflictException(
        'Esta pessoa tem outras pessoas subordinadas na hierarquia e não pode ser removida — reatribua os subordinados primeiro',
      );
    }

    const hasProviders = await this.prisma.provider.findFirst({
      where: { responsibleAssignmentId: id },
    });
    if (hasProviders) {
      throw new ConflictException(
        'Esta pessoa é responsável por prestadores e não pode ser removida — reatribua os prestadores primeiro',
      );
    }

    await this.prisma.hierarchyAssignment.delete({ where: { id } });

    await this.audit.record({
      action: 'hierarchyAssignment.deleted',
      entityType: 'HierarchyAssignment',
      entityId: id,
      companyId,
      actorUserId,
      ip,
    });
  }

  // Sobe de um assignment (ex.: o responsável direto de um Prestador) até a raiz
  // da cadeia — é a sequência de aprovação de um lançamento, do primeiro nível
  // até o topo (depois disso sempre vem a etapa fixa Financeiro, fora desta árvore).
  async getApprovalChain(companyId: string, startAssignmentId: string) {
    const chain: HierarchyAssignment[] = [];
    const visited = new Set<string>();
    let currentId: string | null = startAssignmentId;

    while (currentId) {
      if (visited.has(currentId)) {
        throw new ConflictException(
          'Ciclo detectado na hierarquia de aprovação',
        );
      }
      visited.add(currentId);

      const node: HierarchyAssignment | null =
        await this.prisma.hierarchyAssignment.findFirst({
          where: { id: currentId, companyId },
        });
      if (!node) break;

      chain.push(node);
      currentId = node.parentId;
    }

    return chain;
  }

  // O próprio nó + toda a subárvore abaixo dele — é o conjunto de assignments
  // que uma pessoa enxerga (ela mesma e todos os subordinados, direta ou
  // indiretamente). Nunca inclui ramos irmãos ou superiores.
  async getVisibleAssignmentIds(companyId: string, rootAssignmentId: string) {
    const ids = [rootAssignmentId];
    const queue = [rootAssignmentId];

    while (queue.length > 0) {
      const currentId = queue.shift() as string;
      const children = await this.prisma.hierarchyAssignment.findMany({
        where: { parentId: currentId, companyId },
        select: { id: true },
      });
      for (const child of children) {
        ids.push(child.id);
        queue.push(child.id);
      }
    }

    return ids;
  }

  private async assertLevelBelongsToCompany(
    companyId: string,
    approvalLevelId: string,
  ) {
    const level = await this.prisma.approvalLevel.findFirst({
      where: { id: approvalLevelId, companyId },
    });
    if (!level) {
      throw new BadRequestException(
        'Nível de aprovação informado não pertence a esta empresa',
      );
    }
  }

  private async assertUserBelongsToCompany(companyId: string, userId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { userId, companyId, status: 'ACTIVE' },
    });
    if (!membership) {
      throw new BadRequestException(
        'Usuário informado não tem vínculo ativo com esta empresa',
      );
    }
  }

  private async assertAssignmentBelongsToCompany(
    companyId: string,
    assignmentId: string,
  ) {
    const assignment = await this.prisma.hierarchyAssignment.findFirst({
      where: { id: assignmentId, companyId },
    });
    if (!assignment) {
      throw new BadRequestException(
        'Vínculo pai informado não pertence a esta empresa',
      );
    }
  }

  private async assertNoCycle(
    companyId: string,
    nodeId: string,
    proposedParentId: string,
  ) {
    const visited = new Set<string>();
    let currentId: string | null = proposedParentId;

    while (currentId) {
      if (currentId === nodeId) {
        throw new BadRequestException(
          'Essa mudança criaria um ciclo na hierarquia (o nó não pode ser ancestral de si mesmo)',
        );
      }
      if (visited.has(currentId)) {
        break;
      }
      visited.add(currentId);

      const node: { parentId: string | null } | null =
        await this.prisma.hierarchyAssignment.findFirst({
          where: { id: currentId, companyId },
          select: { parentId: true },
        });
      currentId = node?.parentId ?? null;
    }
  }
}
