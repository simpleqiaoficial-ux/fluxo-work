import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, ServiceOrderStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProvidersService } from '../providers/providers.service';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { FinanceDecisionDto } from './dto/finance-decision.dto';
import { ManagerDecisionDto } from './dto/manager-decision.dto';
import { ServiceOrderDecision } from './dto/service-order-decision.enum';
import { UpdateServiceOrderDto } from './dto/update-service-order.dto';
import { calculateServiceOrderTotal } from './service-order-total.util';

const EDITABLE_STATUSES: ServiceOrderStatus[] = [
  'PENDING_MANAGER_APPROVAL',
  'ADJUSTMENT_REQUESTED',
];
const TERMINAL_STATUSES: ServiceOrderStatus[] = [
  'APPROVED',
  'REJECTED',
  'CANCELLED',
];

@Injectable()
export class ServiceOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly providersService: ProvidersService,
  ) {}

  async create(
    companyId: string,
    actorUserId: string,
    dto: CreateServiceOrderDto,
    ip?: string,
  ) {
    await this.providersService.findById(companyId, dto.providerId);
    if (dto.commercialAgreementId) {
      await this.assertAgreementBelongsToProvider(
        companyId,
        dto.providerId,
        dto.commercialAgreementId,
      );
    }

    const order = await this.prisma.serviceOrder.create({
      data: {
        companyId,
        providerId: dto.providerId,
        commercialAgreementId: dto.commercialAgreementId,
        description: dto.description,
        baseValue: dto.baseValue,
        bonus: dto.bonus ?? 0,
        commission: dto.commission ?? 0,
        additionals: dto.additionals ?? 0,
        reimbursements: dto.reimbursements ?? 0,
        createdByUserId: actorUserId,
      },
    });

    await this.audit.record({
      action: 'serviceOrder.created',
      entityType: 'ServiceOrder',
      entityId: order.id,
      companyId,
      actorUserId,
      after: { status: order.status, providerId: order.providerId },
      ip,
    });

    return order;
  }

  findAllForCompany(companyId: string, status?: ServiceOrderStatus) {
    return this.prisma.serviceOrder.findMany({
      where: { companyId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(companyId: string, id: string) {
    const order = await this.prisma.serviceOrder.findFirst({
      where: { id, companyId },
    });
    if (!order) {
      throw new NotFoundException('Ordem de serviço não encontrada');
    }
    return order;
  }

  async update(
    companyId: string,
    id: string,
    actorUserId: string,
    dto: UpdateServiceOrderDto,
    ip?: string,
  ) {
    const before = await this.findById(companyId, id);

    if (!EDITABLE_STATUSES.includes(before.status)) {
      throw new ConflictException(
        'Só é possível editar uma ordem de serviço aguardando aprovação do gerente ou com ajuste solicitado',
      );
    }

    if (dto.commercialAgreementId) {
      await this.assertAgreementBelongsToProvider(
        companyId,
        before.providerId,
        dto.commercialAgreementId,
      );
    }

    const resubmitting = before.status === 'ADJUSTMENT_REQUESTED';

    const order = await this.prisma.serviceOrder.update({
      where: { id },
      data: {
        commercialAgreementId: dto.commercialAgreementId,
        description: dto.description,
        baseValue: dto.baseValue,
        bonus: dto.bonus,
        commission: dto.commission,
        additionals: dto.additionals,
        reimbursements: dto.reimbursements,
        status: resubmitting ? 'PENDING_MANAGER_APPROVAL' : undefined,
      },
    });

    await this.audit.record({
      action: resubmitting
        ? 'serviceOrder.resubmitted'
        : 'serviceOrder.updated',
      entityType: 'ServiceOrder',
      entityId: id,
      companyId,
      actorUserId,
      before: { status: before.status },
      after: { status: order.status },
      ip,
    });

    return order;
  }

  async managerDecision(
    companyId: string,
    id: string,
    actorUserId: string,
    dto: ManagerDecisionDto,
    ip?: string,
  ) {
    const before = await this.findById(companyId, id);

    if (before.status !== 'PENDING_MANAGER_APPROVAL') {
      throw new ConflictException(
        'Esta ordem de serviço não está aguardando decisão do gerente',
      );
    }
    this.assertNoteRequiredForDecision(dto.decision, dto.note);

    const nextStatus = this.resolveDecisionStatus(
      dto.decision,
      'PENDING_FINANCE_APPROVAL',
    );

    const order = await this.prisma.serviceOrder.update({
      where: { id },
      data: {
        status: nextStatus,
        managerDecisionByUserId: actorUserId,
        managerDecisionAt: new Date(),
        managerDecisionNote: dto.note,
      },
    });

    await this.audit.record({
      action: 'serviceOrder.managerDecision',
      entityType: 'ServiceOrder',
      entityId: id,
      companyId,
      actorUserId,
      before: { status: before.status },
      after: { status: order.status, decision: dto.decision },
      context: dto.note ? { note: dto.note } : undefined,
      ip,
    });

    return order;
  }

  async financeDecision(
    companyId: string,
    id: string,
    actorUserId: string,
    dto: FinanceDecisionDto,
    ip?: string,
  ) {
    const before = await this.findById(companyId, id);

    if (before.status !== 'PENDING_FINANCE_APPROVAL') {
      throw new ConflictException(
        'Esta ordem de serviço não está aguardando decisão do financeiro',
      );
    }
    this.assertNoteRequiredForDecision(dto.decision, dto.note);

    const nextStatus = this.resolveDecisionStatus(dto.decision, 'APPROVED');
    const applyAdjustment =
      dto.decision === ServiceOrderDecision.APPROVE &&
      dto.adjustments !== undefined;

    const order = await this.prisma.serviceOrder.update({
      where: { id },
      data: {
        status: nextStatus,
        financeDecisionByUserId: actorUserId,
        financeDecisionAt: new Date(),
        financeDecisionNote: dto.note,
        adjustments: applyAdjustment ? dto.adjustments : undefined,
      },
    });

    await this.audit.record({
      action: 'serviceOrder.financeDecision',
      entityType: 'ServiceOrder',
      entityId: id,
      companyId,
      actorUserId,
      before: {
        status: before.status,
        adjustments: before.adjustments.toString(),
      },
      after: {
        status: order.status,
        decision: dto.decision,
        adjustments: order.adjustments.toString(),
      },
      context: dto.note ? { note: dto.note } : undefined,
      ip,
    });

    return order;
  }

  async cancel(
    companyId: string,
    id: string,
    actorUserId: string,
    ip?: string,
  ) {
    const before = await this.findById(companyId, id);

    if (TERMINAL_STATUSES.includes(before.status)) {
      throw new ConflictException(
        'Esta ordem de serviço já está em um estado final e não pode ser cancelada',
      );
    }

    const order = await this.prisma.serviceOrder.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    await this.audit.record({
      action: 'serviceOrder.cancelled',
      entityType: 'ServiceOrder',
      entityId: id,
      companyId,
      actorUserId,
      before: { status: before.status },
      after: { status: order.status },
      ip,
    });

    return order;
  }

  calculateTotal(order: {
    baseValue: Prisma.Decimal;
    bonus: Prisma.Decimal;
    commission: Prisma.Decimal;
    additionals: Prisma.Decimal;
    reimbursements: Prisma.Decimal;
    adjustments: Prisma.Decimal;
  }) {
    return calculateServiceOrderTotal(order);
  }

  private resolveDecisionStatus(
    decision: ServiceOrderDecision,
    approveStatus: ServiceOrderStatus,
  ): ServiceOrderStatus {
    switch (decision) {
      case ServiceOrderDecision.APPROVE:
        return approveStatus;
      case ServiceOrderDecision.REJECT:
        return 'REJECTED';
      case ServiceOrderDecision.REQUEST_ADJUSTMENT:
        return 'ADJUSTMENT_REQUESTED';
      default:
        throw new BadRequestException('Decisão inválida');
    }
  }

  // Recusar ou pedir ajuste sem justificativa deixaria a trilha de auditoria sem o
  // "porquê" — só o "o quê". Aprovar não exige nota (é o caminho feliz).
  private assertNoteRequiredForDecision(
    decision: ServiceOrderDecision,
    note?: string,
  ) {
    const requiresNote =
      decision === ServiceOrderDecision.REJECT ||
      decision === ServiceOrderDecision.REQUEST_ADJUSTMENT;
    if (requiresNote && !note?.trim()) {
      throw new BadRequestException(
        'Informe uma justificativa para recusar ou pedir ajuste',
      );
    }
  }

  private async assertAgreementBelongsToProvider(
    companyId: string,
    providerId: string,
    commercialAgreementId: string,
  ) {
    const agreement = await this.prisma.commercialAgreement.findFirst({
      where: { id: commercialAgreementId, companyId, providerId },
    });
    if (!agreement) {
      throw new BadRequestException(
        'Acordo comercial informado não pertence a este prestador',
      );
    }
  }
}
