import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CNPJ_LOOKUP_SERVICE } from './cnpj-lookup/cnpj-lookup.interface';
import type { CnpjLookupService } from './cnpj-lookup/cnpj-lookup.interface';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';

@Injectable()
export class ProvidersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(CNPJ_LOOKUP_SERVICE) private readonly cnpjLookup: CnpjLookupService,
  ) {}

  async create(
    companyId: string,
    actorUserId: string,
    dto: CreateProviderDto,
    ip?: string,
  ) {
    const lookup = await this.cnpjLookup.lookup(dto.cnpj);
    if (!lookup.valid) {
      throw new BadRequestException('CNPJ inválido');
    }

    const existing = await this.prisma.provider.findUnique({
      where: { companyId_cnpj: { companyId, cnpj: dto.cnpj } },
    });
    if (existing) {
      throw new ConflictException(
        'Já existe um prestador com este CNPJ nesta empresa',
      );
    }

    if (dto.responsibleAssignmentId) {
      await this.assertAssignmentBelongsToCompany(
        companyId,
        dto.responsibleAssignmentId,
      );
    }

    const provider = await this.prisma.provider.create({
      data: {
        companyId,
        cnpj: dto.cnpj,
        legalName: dto.legalName,
        tradeName: dto.tradeName,
        contactName: dto.contactName,
        cpf: dto.cpf,
        rg: dto.rg,
        address: dto.address as Prisma.InputJsonValue,
        responsibleAssignmentId: dto.responsibleAssignmentId,
      },
    });

    await this.audit.record({
      action: 'provider.created',
      entityType: 'Provider',
      entityId: provider.id,
      companyId,
      actorUserId,
      after: { cnpj: provider.cnpj, legalName: provider.legalName },
      ip,
    });

    return provider;
  }

  findAll(companyId: string) {
    return this.prisma.provider.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(companyId: string, id: string) {
    const provider = await this.prisma.provider.findFirst({
      where: { id, companyId },
    });
    if (!provider) {
      throw new NotFoundException('Prestador não encontrado');
    }
    return provider;
  }

  async update(
    companyId: string,
    id: string,
    actorUserId: string,
    dto: UpdateProviderDto,
    ip?: string,
  ) {
    const before = await this.findById(companyId, id);

    if (dto.responsibleAssignmentId) {
      await this.assertAssignmentBelongsToCompany(
        companyId,
        dto.responsibleAssignmentId,
      );
    }

    const provider = await this.prisma.provider.update({
      where: { id },
      data: {
        legalName: dto.legalName,
        tradeName: dto.tradeName,
        contactName: dto.contactName,
        rg: dto.rg,
        address: dto.address as Prisma.InputJsonValue | undefined,
        status: dto.status,
        responsibleAssignmentId: dto.responsibleAssignmentId,
      },
    });

    await this.audit.record({
      action: 'provider.updated',
      entityType: 'Provider',
      entityId: id,
      companyId,
      actorUserId,
      before: { legalName: before.legalName, status: before.status },
      after: { legalName: provider.legalName, status: provider.status },
      ip,
    });

    return provider;
  }

  private async assertAssignmentBelongsToCompany(
    companyId: string,
    responsibleAssignmentId: string,
  ) {
    const assignment = await this.prisma.hierarchyAssignment.findFirst({
      where: { id: responsibleAssignmentId, companyId },
    });
    if (!assignment) {
      throw new BadRequestException(
        'Responsável informado não pertence a esta empresa',
      );
    }
  }
}
