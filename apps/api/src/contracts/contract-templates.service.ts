import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContractTemplateDto } from './dto/create-contract-template.dto';
import { UpdateContractTemplateDto } from './dto/update-contract-template.dto';

@Injectable()
export class ContractTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(
    companyId: string,
    actorUserId: string,
    dto: CreateContractTemplateDto,
    ip?: string,
  ) {
    const template = await this.prisma.contractTemplate.create({
      data: {
        companyId,
        name: dto.name,
        activityType: dto.activityType,
        bodyTemplate: dto.bodyTemplate,
      },
    });

    await this.audit.record({
      action: 'contractTemplate.created',
      entityType: 'ContractTemplate',
      entityId: template.id,
      companyId,
      actorUserId,
      after: { name: template.name, activityType: template.activityType },
      ip,
    });

    return template;
  }

  findAll(companyId: string) {
    return this.prisma.contractTemplate.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(companyId: string, id: string) {
    const template = await this.prisma.contractTemplate.findFirst({
      where: { id, companyId },
    });
    if (!template) {
      throw new NotFoundException('Modelo de contrato não encontrado');
    }
    return template;
  }

  async update(
    companyId: string,
    id: string,
    actorUserId: string,
    dto: UpdateContractTemplateDto,
    ip?: string,
  ) {
    const before = await this.findById(companyId, id);

    const template = await this.prisma.contractTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        activityType: dto.activityType,
        bodyTemplate: dto.bodyTemplate,
        status: dto.status,
      },
    });

    await this.audit.record({
      action: 'contractTemplate.updated',
      entityType: 'ContractTemplate',
      entityId: id,
      companyId,
      actorUserId,
      before: { status: before.status },
      after: { status: template.status },
      ip,
    });

    return template;
  }
}
