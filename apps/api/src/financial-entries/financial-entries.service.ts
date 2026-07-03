import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { FinancialEntryStatus, Role } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { HierarchyAssignmentsService } from '../approval-hierarchy/hierarchy-assignments.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProvidersService } from '../providers/providers.service';
import { CreateFinancialEntryDto } from './dto/create-financial-entry.dto';
import { FinancialEntryDecision } from './dto/financial-entry-decision.enum';
import { StepDecisionDto } from './dto/step-decision.dto';
import { UpdateFinancialEntryDto } from './dto/update-financial-entry.dto';

const EDITABLE_STATUSES: FinancialEntryStatus[] = [
  'DRAFT',
  'ADJUSTMENT_REQUESTED',
];
const CANCELLABLE_STATUSES: FinancialEntryStatus[] = [
  'DRAFT',
  'IN_APPROVAL',
  'ADJUSTMENT_REQUESTED',
  'IN_FINANCE_REVIEW',
];
const GLOBAL_VISIBILITY_ROLES: Role[] = ['ADMIN', 'FINANCEIRO'];

@Injectable()
export class FinancialEntriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly providersService: ProvidersService,
    private readonly hierarchyAssignmentsService: HierarchyAssignmentsService,
  ) {}

  async create(
    companyId: string,
    actorUserId: string,
    dto: CreateFinancialEntryDto,
    ip?: string,
  ) {
    await this.providersService.findById(companyId, dto.providerId);
    const entryNumber = await this.nextEntryNumber(companyId);

    const entry = await this.prisma.financialEntry.create({
      data: {
        companyId,
        providerId: dto.providerId,
        entryNumber,
        competencia: dto.competencia,
        type: dto.type,
        description: dto.description,
        amount: dto.amount,
        expectedDate: new Date(dto.expectedDate),
        dueDate: new Date(dto.dueDate),
        paymentMethod: dto.paymentMethod,
        priority: dto.priority,
        notes: dto.notes,
        createdByUserId: actorUserId,
      },
    });

    await this.audit.record({
      action: 'financialEntry.created',
      entityType: 'FinancialEntry',
      entityId: entry.id,
      companyId,
      actorUserId,
      after: { entryNumber: entry.entryNumber, status: entry.status },
      ip,
    });

    return entry;
  }

  async findAllForCompany(
    companyId: string,
    currentUserId: string,
    role: Role | undefined,
    status?: FinancialEntryStatus,
  ) {
    if (role && GLOBAL_VISIBILITY_ROLES.includes(role)) {
      return this.prisma.financialEntry.findMany({
        where: { companyId, ...(status ? { status } : {}) },
        orderBy: { createdAt: 'desc' },
      });
    }

    const visibleAssignmentIds = await this.getVisibleAssignmentIdsForUser(
      companyId,
      currentUserId,
    );

    return this.prisma.financialEntry.findMany({
      where: {
        companyId,
        ...(status ? { status } : {}),
        OR: [
          { createdByUserId: currentUserId },
          {
            provider: {
              responsibleAssignmentId: { in: visibleAssignmentIds },
            },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(
    companyId: string,
    id: string,
    currentUserId: string,
    role: Role | undefined,
  ) {
    const entry = await this.findRaw(companyId, id);
    await this.assertVisible(companyId, entry, currentUserId, role);
    return entry;
  }

  async update(
    companyId: string,
    id: string,
    actorUserId: string,
    isAdmin: boolean,
    dto: UpdateFinancialEntryDto,
    ip?: string,
  ) {
    const before = await this.findRaw(companyId, id);
    this.assertOwnerOrAdmin(before, actorUserId, isAdmin);

    if (!EDITABLE_STATUSES.includes(before.status)) {
      throw new ConflictException(
        'Só é possível editar um lançamento em rascunho ou com ajuste solicitado',
      );
    }

    const entry = await this.prisma.financialEntry.update({
      where: { id },
      data: {
        competencia: dto.competencia,
        type: dto.type,
        description: dto.description,
        amount: dto.amount,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        paymentMethod: dto.paymentMethod,
        priority: dto.priority,
        notes: dto.notes,
      },
    });

    await this.audit.record({
      action: 'financialEntry.updated',
      entityType: 'FinancialEntry',
      entityId: id,
      companyId,
      actorUserId,
      before: { status: before.status },
      after: { status: entry.status },
      ip,
    });

    return entry;
  }

  // Move DRAFT ou ADJUSTMENT_REQUESTED -> IN_APPROVAL, sempre regenerando a
  // cadeia de aprovação do zero a partir do responsável atual do Prestador —
  // mesmo espírito do "reinicia o ciclo completo" já usado em Ordens de Serviço.
  async submit(
    companyId: string,
    id: string,
    actorUserId: string,
    isAdmin: boolean,
    ip?: string,
  ) {
    const before = await this.findRaw(companyId, id);
    this.assertOwnerOrAdmin(before, actorUserId, isAdmin);

    if (before.status !== 'DRAFT' && before.status !== 'ADJUSTMENT_REQUESTED') {
      throw new ConflictException(
        'Só é possível enviar um lançamento em rascunho ou com ajuste solicitado',
      );
    }

    const provider = await this.providersService.findById(
      companyId,
      before.providerId,
    );
    if (!provider.responsibleAssignmentId) {
      throw new BadRequestException(
        'Este prestador não tem um responsável definido na hierarquia — configure isso antes de enviar o lançamento',
      );
    }

    const chain = await this.hierarchyAssignmentsService.getApprovalChain(
      companyId,
      provider.responsibleAssignmentId,
    );
    if (chain.length === 0) {
      throw new BadRequestException(
        'Não foi possível resolver a cadeia de aprovação deste prestador',
      );
    }

    await this.prisma.financialEntryApprovalStep.deleteMany({
      where: { financialEntryId: id },
    });
    await this.prisma.financialEntryApprovalStep.createMany({
      data: chain.map((node, index) => ({
        financialEntryId: id,
        sequence: index + 1,
        hierarchyAssignmentId: node.id,
      })),
    });

    const entry = await this.prisma.financialEntry.update({
      where: { id },
      data: { status: 'IN_APPROVAL' },
    });

    await this.audit.record({
      action: 'financialEntry.submitted',
      entityType: 'FinancialEntry',
      entityId: id,
      companyId,
      actorUserId,
      before: { status: before.status },
      after: { status: entry.status, stepCount: chain.length },
      ip,
    });

    return entry;
  }

  // Decide a etapa atualmente PENDING da cadeia configurável. Só quem ocupa
  // aquele HierarchyAssignment (ou ADMIN) pode decidir — autorização por
  // posição na árvore, não só por Role.
  async decideStep(
    companyId: string,
    id: string,
    actorUserId: string,
    isAdmin: boolean,
    dto: StepDecisionDto,
    ip?: string,
  ) {
    const entry = await this.findRaw(companyId, id);
    if (entry.status !== 'IN_APPROVAL') {
      throw new ConflictException(
        'Este lançamento não está aguardando aprovação de um nível da cadeia',
      );
    }

    const steps = await this.prisma.financialEntryApprovalStep.findMany({
      where: { financialEntryId: id },
      orderBy: { sequence: 'asc' },
    });
    const currentStep = steps.find((step) => step.status === 'PENDING');
    if (!currentStep) {
      throw new ConflictException(
        'Não há etapa pendente nesta cadeia de aprovação',
      );
    }

    if (!isAdmin) {
      const assignment = await this.prisma.hierarchyAssignment.findFirst({
        where: { id: currentStep.hierarchyAssignmentId, companyId },
      });
      if (!assignment || assignment.userId !== actorUserId) {
        throw new ForbiddenException(
          'Só a pessoa responsável por esta etapa pode decidir',
        );
      }
    }
    this.assertNoteRequiredForDecision(dto.decision, dto.note);

    const isLastStep =
      currentStep.sequence === steps[steps.length - 1].sequence;
    const stepStatus =
      dto.decision === FinancialEntryDecision.APPROVE
        ? 'APPROVED'
        : dto.decision === FinancialEntryDecision.REJECT
          ? 'REJECTED'
          : 'ADJUSTMENT_REQUESTED';

    await this.prisma.financialEntryApprovalStep.update({
      where: { id: currentStep.id },
      data: {
        status: stepStatus,
        decidedByUserId: actorUserId,
        decidedAt: new Date(),
        note: dto.note,
      },
    });

    const nextEntryStatus: FinancialEntryStatus =
      dto.decision === FinancialEntryDecision.APPROVE
        ? isLastStep
          ? 'IN_FINANCE_REVIEW'
          : 'IN_APPROVAL'
        : dto.decision === FinancialEntryDecision.REJECT
          ? 'REJECTED'
          : 'ADJUSTMENT_REQUESTED';

    const updated = await this.prisma.financialEntry.update({
      where: { id },
      data: { status: nextEntryStatus },
    });

    await this.audit.record({
      action: 'financialEntry.stepDecision',
      entityType: 'FinancialEntry',
      entityId: id,
      companyId,
      actorUserId,
      before: { status: entry.status },
      after: {
        status: updated.status,
        sequence: currentStep.sequence,
        decision: dto.decision,
      },
      context: dto.note ? { note: dto.note } : undefined,
      ip,
    });

    return updated;
  }

  async financeDecision(
    companyId: string,
    id: string,
    actorUserId: string,
    dto: StepDecisionDto,
    ip?: string,
  ) {
    const before = await this.findRaw(companyId, id);
    if (before.status !== 'IN_FINANCE_REVIEW') {
      throw new ConflictException(
        'Este lançamento não está aguardando decisão do financeiro',
      );
    }
    this.assertNoteRequiredForDecision(dto.decision, dto.note);

    const nextStatus: FinancialEntryStatus =
      dto.decision === FinancialEntryDecision.APPROVE
        ? 'SCHEDULED'
        : dto.decision === FinancialEntryDecision.REJECT
          ? 'REJECTED'
          : 'ADJUSTMENT_REQUESTED';

    const entry = await this.prisma.financialEntry.update({
      where: { id },
      data: { status: nextStatus },
    });

    await this.audit.record({
      action: 'financialEntry.financeDecision',
      entityType: 'FinancialEntry',
      entityId: id,
      companyId,
      actorUserId,
      before: { status: before.status },
      after: { status: entry.status, decision: dto.decision },
      context: dto.note ? { note: dto.note } : undefined,
      ip,
    });

    return entry;
  }

  async markPaid(
    companyId: string,
    id: string,
    actorUserId: string,
    ip?: string,
  ) {
    const before = await this.findRaw(companyId, id);
    if (before.status !== 'SCHEDULED') {
      throw new ConflictException(
        'Só é possível marcar como pago um lançamento programado',
      );
    }

    const entry = await this.prisma.financialEntry.update({
      where: { id },
      data: { status: 'PAID' },
    });

    await this.audit.record({
      action: 'financialEntry.paid',
      entityType: 'FinancialEntry',
      entityId: id,
      companyId,
      actorUserId,
      before: { status: before.status },
      after: { status: entry.status },
      ip,
    });

    return entry;
  }

  async cancel(
    companyId: string,
    id: string,
    actorUserId: string,
    isAdmin: boolean,
    ip?: string,
  ) {
    const before = await this.findRaw(companyId, id);
    this.assertOwnerOrAdmin(before, actorUserId, isAdmin);

    if (!CANCELLABLE_STATUSES.includes(before.status)) {
      throw new ConflictException(
        'Este lançamento não pode mais ser cancelado neste estado',
      );
    }

    const entry = await this.prisma.financialEntry.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    await this.audit.record({
      action: 'financialEntry.cancelled',
      entityType: 'FinancialEntry',
      entityId: id,
      companyId,
      actorUserId,
      before: { status: before.status },
      after: { status: entry.status },
      ip,
    });

    return entry;
  }

  private async findRaw(companyId: string, id: string) {
    const entry = await this.prisma.financialEntry.findFirst({
      where: { id, companyId },
      include: {
        steps: {
          orderBy: { sequence: 'asc' },
          include: {
            hierarchyAssignment: {
              include: { approvalLevel: true, user: true },
            },
          },
        },
      },
    });
    if (!entry) {
      throw new NotFoundException('Lançamento financeiro não encontrado');
    }
    return entry;
  }

  private async getVisibleAssignmentIdsForUser(
    companyId: string,
    userId: string,
  ) {
    const ownAssignments = await this.prisma.hierarchyAssignment.findMany({
      where: { companyId, userId },
      select: { id: true },
    });

    const visible = new Set<string>();
    for (const assignment of ownAssignments) {
      const subtree =
        await this.hierarchyAssignmentsService.getVisibleAssignmentIds(
          companyId,
          assignment.id,
        );
      subtree.forEach((assignmentId) => visible.add(assignmentId));
    }

    return Array.from(visible);
  }

  private async assertVisible(
    companyId: string,
    entry: Awaited<ReturnType<FinancialEntriesService['findRaw']>>,
    currentUserId: string,
    role: Role | undefined,
  ) {
    if (role && GLOBAL_VISIBILITY_ROLES.includes(role)) {
      return;
    }
    if (entry.createdByUserId === currentUserId) {
      return;
    }

    const provider = await this.prisma.provider.findUnique({
      where: { id: entry.providerId },
      select: { responsibleAssignmentId: true },
    });
    if (provider?.responsibleAssignmentId) {
      const visibleIds = await this.getVisibleAssignmentIdsForUser(
        companyId,
        currentUserId,
      );
      if (visibleIds.includes(provider.responsibleAssignmentId)) {
        return;
      }
    }

    throw new ForbiddenException('Você não tem acesso a este lançamento');
  }

  private assertOwnerOrAdmin(
    entry: { createdByUserId: string },
    actorUserId: string,
    isAdmin: boolean,
  ) {
    if (!isAdmin && entry.createdByUserId !== actorUserId) {
      throw new ForbiddenException(
        'Só quem criou o lançamento (ou um administrador) pode fazer isso',
      );
    }
  }

  private assertNoteRequiredForDecision(
    decision: FinancialEntryDecision,
    note?: string,
  ) {
    const requiresNote =
      decision === FinancialEntryDecision.REJECT ||
      decision === FinancialEntryDecision.REQUEST_ADJUSTMENT;
    if (requiresNote && !note?.trim()) {
      throw new BadRequestException(
        'Informe uma justificativa para recusar ou pedir ajuste',
      );
    }
  }

  private async nextEntryNumber(companyId: string) {
    const last = await this.prisma.financialEntry.findFirst({
      where: { companyId },
      orderBy: { entryNumber: 'desc' },
      select: { entryNumber: true },
    });
    return (last?.entryNumber ?? 0) + 1;
  }
}
