import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApprovalLevelDto } from './dto/create-approval-level.dto';
import { UpdateApprovalLevelDto } from './dto/update-approval-level.dto';

@Injectable()
export class ApprovalLevelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(
    companyId: string,
    actorUserId: string,
    dto: CreateApprovalLevelDto,
    ip?: string,
  ) {
    await this.assertOrderAvailable(companyId, dto.order);

    const level = await this.prisma.approvalLevel.create({
      data: { companyId, name: dto.name, order: dto.order },
    });

    await this.audit.record({
      action: 'approvalLevel.created',
      entityType: 'ApprovalLevel',
      entityId: level.id,
      companyId,
      actorUserId,
      after: { name: level.name, order: level.order },
      ip,
    });

    return level;
  }

  findAll(companyId: string) {
    return this.prisma.approvalLevel.findMany({
      where: { companyId },
      orderBy: { order: 'asc' },
    });
  }

  async findById(companyId: string, id: string) {
    const level = await this.prisma.approvalLevel.findFirst({
      where: { id, companyId },
    });
    if (!level) {
      throw new NotFoundException('Nível de aprovação não encontrado');
    }
    return level;
  }

  async update(
    companyId: string,
    id: string,
    actorUserId: string,
    dto: UpdateApprovalLevelDto,
    ip?: string,
  ) {
    const before = await this.findById(companyId, id);

    if (dto.order !== undefined && dto.order !== before.order) {
      await this.assertOrderAvailable(companyId, dto.order);
    }

    const level = await this.prisma.approvalLevel.update({
      where: { id },
      data: { name: dto.name, order: dto.order },
    });

    await this.audit.record({
      action: 'approvalLevel.updated',
      entityType: 'ApprovalLevel',
      entityId: id,
      companyId,
      actorUserId,
      before: { name: before.name, order: before.order },
      after: { name: level.name, order: level.order },
      ip,
    });

    return level;
  }

  async remove(
    companyId: string,
    id: string,
    actorUserId: string,
    ip?: string,
  ) {
    await this.findById(companyId, id);

    const inUse = await this.prisma.hierarchyAssignment.findFirst({
      where: { approvalLevelId: id },
    });
    if (inUse) {
      throw new ConflictException(
        'Este nível de aprovação está em uso por pessoas na hierarquia e não pode ser removido',
      );
    }

    await this.prisma.approvalLevel.delete({ where: { id } });

    await this.audit.record({
      action: 'approvalLevel.deleted',
      entityType: 'ApprovalLevel',
      entityId: id,
      companyId,
      actorUserId,
      ip,
    });
  }

  private async assertOrderAvailable(companyId: string, order: number) {
    const existing = await this.prisma.approvalLevel.findUnique({
      where: { companyId_order: { companyId, order } },
    });
    if (existing) {
      throw new ConflictException(
        `Já existe um nível de aprovação com a ordem ${order} nesta empresa`,
      );
    }
  }
}
