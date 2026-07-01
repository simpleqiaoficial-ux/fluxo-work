import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createWithAdmin(userId: string, dto: CreateCompanyDto, ip?: string) {
    const existing = await this.prisma.company.findUnique({
      where: { cnpj: dto.cnpj },
    });
    if (existing) {
      throw new ConflictException(
        'Já existe uma empresa cadastrada com este CNPJ',
      );
    }

    const company = await this.prisma.company.create({
      data: {
        legalName: dto.legalName,
        tradeName: dto.tradeName,
        cnpj: dto.cnpj,
      },
    });

    const membership = await this.prisma.membership.create({
      data: {
        userId,
        companyId: company.id,
        role: 'ADMIN',
        status: 'ACTIVE',
        acceptedAt: new Date(),
      },
    });

    await this.audit.record({
      action: 'company.created',
      entityType: 'Company',
      entityId: company.id,
      companyId: company.id,
      actorUserId: userId,
      after: { legalName: company.legalName, cnpj: company.cnpj },
      ip,
    });

    return { company, membership };
  }

  async findById(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }
    return company;
  }

  async update(
    companyId: string,
    actorUserId: string,
    dto: UpdateCompanyDto,
    ip?: string,
  ) {
    const before = await this.findById(companyId);

    const company = await this.prisma.company.update({
      where: { id: companyId },
      data: { tradeName: dto.tradeName },
    });

    await this.audit.record({
      action: 'company.updated',
      entityType: 'Company',
      entityId: company.id,
      companyId: company.id,
      actorUserId,
      before: { tradeName: before.tradeName },
      after: { tradeName: company.tradeName },
      ip,
    });

    return company;
  }
}
