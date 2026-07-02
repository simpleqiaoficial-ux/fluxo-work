import { Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommercialAgreementDto } from './dto/create-commercial-agreement.dto';
import { ProvidersService } from './providers.service';

@Injectable()
export class CommercialAgreementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly providersService: ProvidersService,
  ) {}

  async create(
    companyId: string,
    providerId: string,
    actorUserId: string,
    dto: CreateCommercialAgreementDto,
    ip?: string,
  ) {
    await this.providersService.findById(companyId, providerId);

    const previousActive = await this.prisma.commercialAgreement.findFirst({
      where: { providerId, status: 'ACTIVE' },
    });

    if (previousActive) {
      await this.prisma.commercialAgreement.update({
        where: { id: previousActive.id },
        data: {
          status: 'TERMINATED',
          endDate: previousActive.endDate ?? new Date(),
        },
      });

      await this.audit.record({
        action: 'commercialAgreement.superseded',
        entityType: 'CommercialAgreement',
        entityId: previousActive.id,
        companyId,
        actorUserId,
        before: { status: 'ACTIVE' },
        after: { status: 'TERMINATED' },
        ip,
      });
    }

    const agreement = await this.prisma.commercialAgreement.create({
      data: {
        companyId,
        providerId,
        type: dto.type,
        baseRate: dto.baseRate,
        scopeDescription: dto.scopeDescription,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });

    await this.audit.record({
      action: 'commercialAgreement.created',
      entityType: 'CommercialAgreement',
      entityId: agreement.id,
      companyId,
      actorUserId,
      after: { type: agreement.type, baseRate: agreement.baseRate.toString() },
      ip,
    });

    return agreement;
  }

  async findAllForProvider(companyId: string, providerId: string) {
    await this.providersService.findById(companyId, providerId);
    return this.prisma.commercialAgreement.findMany({
      where: { providerId, companyId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
