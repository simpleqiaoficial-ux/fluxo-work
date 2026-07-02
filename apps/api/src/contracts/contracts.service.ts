import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProvidersService } from '../providers/providers.service';
import { ContractTemplatesService } from './contract-templates.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractSignatureDto } from './dto/update-contract-signature.dto';
import { renderTemplate } from './template-renderer.util';

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly providersService: ProvidersService,
    private readonly contractTemplatesService: ContractTemplatesService,
  ) {}

  async create(
    companyId: string,
    providerId: string,
    actorUserId: string,
    dto: CreateContractDto,
    ip?: string,
  ) {
    const provider = await this.providersService.findById(
      companyId,
      providerId,
    );
    const template = await this.contractTemplatesService.findById(
      companyId,
      dto.templateId,
    );
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
    });
    const agreement = await this.prisma.commercialAgreement.findFirst({
      where: { providerId, status: 'ACTIVE' },
    });

    const content = renderTemplate(template.bodyTemplate, {
      provider,
      company,
      agreement,
    });

    const previousActive = await this.prisma.contract.findFirst({
      where: { providerId, status: 'ACTIVE' },
    });

    if (previousActive) {
      await this.prisma.contract.update({
        where: { id: previousActive.id },
        data: { status: 'SUPERSEDED' },
      });

      await this.audit.record({
        action: 'contract.superseded',
        entityType: 'Contract',
        entityId: previousActive.id,
        companyId,
        actorUserId,
        before: { status: 'ACTIVE' },
        after: { status: 'SUPERSEDED' },
        ip,
      });
    }

    const contract = await this.prisma.contract.create({
      data: {
        companyId,
        providerId,
        templateId: template.id,
        version: previousActive ? previousActive.version + 1 : 1,
        content,
        status: 'ACTIVE',
      },
    });

    await this.audit.record({
      action: 'contract.created',
      entityType: 'Contract',
      entityId: contract.id,
      companyId,
      actorUserId,
      after: { version: contract.version, templateId: template.id },
      ip,
    });

    return contract;
  }

  findAllForProvider(companyId: string, providerId: string) {
    return this.prisma.contract.findMany({
      where: { providerId, companyId },
      orderBy: { version: 'desc' },
    });
  }

  async findById(companyId: string, providerId: string, id: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, companyId, providerId },
    });
    if (!contract) {
      throw new NotFoundException('Contrato não encontrado');
    }
    return contract;
  }

  async updateSignature(
    companyId: string,
    providerId: string,
    id: string,
    actorUserId: string,
    dto: UpdateContractSignatureDto,
    ip?: string,
  ) {
    const before = await this.findById(companyId, providerId, id);

    const contract = await this.prisma.contract.update({
      where: { id },
      data: {
        signatureStatus: dto.signatureStatus,
        signedAt: dto.signatureStatus === 'SIGNED' ? new Date() : null,
      },
    });

    await this.audit.record({
      action: 'contract.signatureUpdated',
      entityType: 'Contract',
      entityId: id,
      companyId,
      actorUserId,
      before: { signatureStatus: before.signatureStatus },
      after: { signatureStatus: contract.signatureStatus },
      ip,
    });

    return contract;
  }
}
