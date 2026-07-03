import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { HierarchyAssignmentsService } from '../approval-hierarchy/hierarchy-assignments.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProvidersService } from '../providers/providers.service';
import { FinancialEntryDecision } from './dto/financial-entry-decision.enum';
import { FinancialEntriesService } from './financial-entries.service';

describe('FinancialEntriesService', () => {
  let service: FinancialEntriesService;
  let prisma: {
    financialEntry: {
      create: jest.Mock<Promise<unknown>, [{ data: Record<string, unknown> }]>;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    financialEntryApprovalStep: {
      deleteMany: jest.Mock;
      createMany: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    hierarchyAssignment: { findFirst: jest.Mock; findMany: jest.Mock };
    provider: { findUnique: jest.Mock };
  };
  let audit: { record: jest.Mock };
  let providersService: { findById: jest.Mock };
  let hierarchyAssignmentsService: {
    getApprovalChain: jest.Mock;
    getVisibleAssignmentIds: jest.Mock;
  };

  const provider = {
    id: 'provider_1',
    responsibleAssignmentId: 'assign_pedro',
  };

  beforeEach(() => {
    prisma = {
      financialEntry: {
        create: jest.fn<
          Promise<unknown>,
          [{ data: Record<string, unknown> }]
        >(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      financialEntryApprovalStep: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      hierarchyAssignment: { findFirst: jest.fn(), findMany: jest.fn() },
      provider: { findUnique: jest.fn() },
    };
    audit = { record: jest.fn() };
    providersService = { findById: jest.fn().mockResolvedValue(provider) };
    hierarchyAssignmentsService = {
      getApprovalChain: jest.fn(),
      getVisibleAssignmentIds: jest.fn(),
    };

    service = new FinancialEntriesService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
      providersService as unknown as ProvidersService,
      hierarchyAssignmentsService as unknown as HierarchyAssignmentsService,
    );
  });

  describe('create', () => {
    it('assigns the next sequential entry number for the company', async () => {
      prisma.financialEntry.findFirst.mockResolvedValue({ entryNumber: 7 });
      prisma.financialEntry.create.mockResolvedValue({
        id: 'entry_1',
        entryNumber: 8,
        status: 'DRAFT',
      });

      await service.create('company_1', 'user_1', {
        providerId: 'provider_1',
        competencia: '2026-07',
        type: 'Remuneração Base',
        description: 'Pagamento mensal',
        amount: 1000,
        expectedDate: '2026-07-10',
        dueDate: '2026-07-15',
      });

      expect(prisma.financialEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ entryNumber: 8 }) as Record<
            string,
            unknown
          >,
        }),
      );
    });

    it('starts at entry number 1 when there are no previous entries', async () => {
      prisma.financialEntry.findFirst.mockResolvedValue(null);
      prisma.financialEntry.create.mockResolvedValue({
        id: 'entry_1',
        entryNumber: 1,
        status: 'DRAFT',
      });

      await service.create('company_1', 'user_1', {
        providerId: 'provider_1',
        competencia: '2026-07',
        type: 'Reembolso',
        description: 'Combustível',
        amount: 200,
        expectedDate: '2026-07-10',
        dueDate: '2026-07-15',
      });

      const createCall = prisma.financialEntry.create.mock.calls[0][0];
      expect(createCall.data.entryNumber).toBe(1);
    });
  });

  describe('submit', () => {
    const draft = {
      id: 'entry_1',
      companyId: 'company_1',
      providerId: 'provider_1',
      createdByUserId: 'user_1',
      status: 'DRAFT',
      steps: [],
    };

    it('rejects submitting when the provider has no responsible assignment', async () => {
      prisma.financialEntry.findFirst.mockResolvedValue(draft);
      providersService.findById.mockResolvedValue({
        id: 'provider_1',
        responsibleAssignmentId: null,
      });

      await expect(
        service.submit('company_1', 'entry_1', 'user_1', false),
      ).rejects.toThrow(BadRequestException);
      expect(
        prisma.financialEntryApprovalStep.createMany,
      ).not.toHaveBeenCalled();
    });

    it('resolves the chain and creates one step per hierarchy level, then moves to IN_APPROVAL', async () => {
      prisma.financialEntry.findFirst.mockResolvedValue(draft);
      providersService.findById.mockResolvedValue(provider);
      hierarchyAssignmentsService.getApprovalChain.mockResolvedValue([
        { id: 'assign_pedro' },
        { id: 'assign_felipe' },
      ]);
      prisma.financialEntry.update.mockResolvedValue({
        ...draft,
        status: 'IN_APPROVAL',
      });

      await service.submit('company_1', 'entry_1', 'user_1', false);

      expect(prisma.financialEntryApprovalStep.deleteMany).toHaveBeenCalledWith(
        {
          where: { financialEntryId: 'entry_1' },
        },
      );
      expect(prisma.financialEntryApprovalStep.createMany).toHaveBeenCalledWith(
        {
          data: [
            {
              financialEntryId: 'entry_1',
              sequence: 1,
              hierarchyAssignmentId: 'assign_pedro',
            },
            {
              financialEntryId: 'entry_1',
              sequence: 2,
              hierarchyAssignmentId: 'assign_felipe',
            },
          ],
        },
      );
      expect(prisma.financialEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'IN_APPROVAL' },
        }),
      );
    });

    it('rejects submitting when the caller is neither the creator nor an admin', async () => {
      prisma.financialEntry.findFirst.mockResolvedValue(draft);

      await expect(
        service.submit('company_1', 'entry_1', 'someone_else', false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects submitting an entry that is already past the draft/adjustment stage', async () => {
      prisma.financialEntry.findFirst.mockResolvedValue({
        ...draft,
        status: 'IN_FINANCE_REVIEW',
      });

      await expect(
        service.submit('company_1', 'entry_1', 'user_1', false),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('decideStep', () => {
    const inApproval = {
      id: 'entry_1',
      companyId: 'company_1',
      providerId: 'provider_1',
      createdByUserId: 'user_1',
      status: 'IN_APPROVAL',
    };
    const stepPedro = {
      id: 'step_pedro',
      sequence: 1,
      status: 'PENDING',
      hierarchyAssignmentId: 'assign_pedro',
    };
    const stepFelipe = {
      id: 'step_felipe',
      sequence: 2,
      status: 'PENDING',
      hierarchyAssignmentId: 'assign_felipe',
    };

    it('only lets the person occupying the pending step decide it', async () => {
      prisma.financialEntry.findFirst.mockResolvedValue(inApproval);
      prisma.financialEntryApprovalStep.findMany.mockResolvedValue([
        stepPedro,
        stepFelipe,
      ]);
      prisma.hierarchyAssignment.findFirst.mockResolvedValue({
        id: 'assign_pedro',
        userId: 'user_pedro',
      });

      await expect(
        service.decideStep('company_1', 'entry_1', 'user_someone_else', false, {
          decision: FinancialEntryDecision.APPROVE,
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.financialEntryApprovalStep.update).not.toHaveBeenCalled();
    });

    it('keeps the entry IN_APPROVAL and advances when a non-final step is approved', async () => {
      prisma.financialEntry.findFirst.mockResolvedValue(inApproval);
      prisma.financialEntryApprovalStep.findMany.mockResolvedValue([
        stepPedro,
        stepFelipe,
      ]);
      prisma.hierarchyAssignment.findFirst.mockResolvedValue({
        id: 'assign_pedro',
        userId: 'user_pedro',
      });
      prisma.financialEntry.update.mockResolvedValue({
        ...inApproval,
        status: 'IN_APPROVAL',
      });

      await service.decideStep('company_1', 'entry_1', 'user_pedro', false, {
        decision: FinancialEntryDecision.APPROVE,
      });

      expect(prisma.financialEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'IN_APPROVAL' } }),
      );
    });

    it('moves to IN_FINANCE_REVIEW when the last step in the chain is approved', async () => {
      prisma.financialEntry.findFirst.mockResolvedValue(inApproval);
      prisma.financialEntryApprovalStep.findMany.mockResolvedValue([
        { ...stepPedro, status: 'APPROVED' },
        stepFelipe,
      ]);
      prisma.hierarchyAssignment.findFirst.mockResolvedValue({
        id: 'assign_felipe',
        userId: 'user_felipe',
      });
      prisma.financialEntry.update.mockResolvedValue({
        ...inApproval,
        status: 'IN_FINANCE_REVIEW',
      });

      await service.decideStep('company_1', 'entry_1', 'user_felipe', false, {
        decision: FinancialEntryDecision.APPROVE,
      });

      expect(prisma.financialEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'IN_FINANCE_REVIEW' } }),
      );
    });

    it('requires a note to reject or request adjustment', async () => {
      prisma.financialEntry.findFirst.mockResolvedValue(inApproval);
      prisma.financialEntryApprovalStep.findMany.mockResolvedValue([stepPedro]);
      prisma.hierarchyAssignment.findFirst.mockResolvedValue({
        id: 'assign_pedro',
        userId: 'user_pedro',
      });

      await expect(
        service.decideStep('company_1', 'entry_1', 'user_pedro', false, {
          decision: FinancialEntryDecision.REJECT,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('an admin can decide any step regardless of who occupies it', async () => {
      prisma.financialEntry.findFirst.mockResolvedValue(inApproval);
      prisma.financialEntryApprovalStep.findMany.mockResolvedValue([stepPedro]);
      prisma.financialEntry.update.mockResolvedValue({
        ...inApproval,
        status: 'IN_FINANCE_REVIEW',
      });

      await service.decideStep('company_1', 'entry_1', 'admin_1', true, {
        decision: FinancialEntryDecision.APPROVE,
      });

      expect(prisma.hierarchyAssignment.findFirst).not.toHaveBeenCalled();
      expect(prisma.financialEntryApprovalStep.update).toHaveBeenCalled();
    });
  });

  describe('financeDecision', () => {
    it('moves to SCHEDULED on approve', async () => {
      prisma.financialEntry.findFirst.mockResolvedValue({
        id: 'entry_1',
        companyId: 'company_1',
        status: 'IN_FINANCE_REVIEW',
      });
      prisma.financialEntry.update.mockResolvedValue({
        id: 'entry_1',
        status: 'SCHEDULED',
      });

      await service.financeDecision('company_1', 'entry_1', 'finance_1', {
        decision: FinancialEntryDecision.APPROVE,
      });

      expect(prisma.financialEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'SCHEDULED' } }),
      );
    });

    it('rejects deciding when the entry is not awaiting finance review', async () => {
      prisma.financialEntry.findFirst.mockResolvedValue({
        id: 'entry_1',
        companyId: 'company_1',
        status: 'IN_APPROVAL',
      });

      await expect(
        service.financeDecision('company_1', 'entry_1', 'finance_1', {
          decision: FinancialEntryDecision.APPROVE,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('markPaid', () => {
    it('only pays a scheduled entry', async () => {
      prisma.financialEntry.findFirst.mockResolvedValue({
        id: 'entry_1',
        companyId: 'company_1',
        status: 'IN_FINANCE_REVIEW',
      });

      await expect(
        service.markPaid('company_1', 'entry_1', 'finance_1'),
      ).rejects.toThrow(ConflictException);
    });

    it('pays a scheduled entry', async () => {
      prisma.financialEntry.findFirst.mockResolvedValue({
        id: 'entry_1',
        companyId: 'company_1',
        status: 'SCHEDULED',
      });
      prisma.financialEntry.update.mockResolvedValue({
        id: 'entry_1',
        status: 'PAID',
      });

      await service.markPaid('company_1', 'entry_1', 'finance_1');

      expect(prisma.financialEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'PAID' } }),
      );
    });
  });

  describe('cancel', () => {
    it('refuses to cancel once a payment has been scheduled and later stages reached', async () => {
      prisma.financialEntry.findFirst.mockResolvedValue({
        id: 'entry_1',
        companyId: 'company_1',
        createdByUserId: 'user_1',
        status: 'PAID',
      });

      await expect(
        service.cancel('company_1', 'entry_1', 'user_1', false),
      ).rejects.toThrow(ConflictException);
    });

    it('lets the creator cancel a draft', async () => {
      prisma.financialEntry.findFirst.mockResolvedValue({
        id: 'entry_1',
        companyId: 'company_1',
        createdByUserId: 'user_1',
        status: 'DRAFT',
      });
      prisma.financialEntry.update.mockResolvedValue({
        id: 'entry_1',
        status: 'CANCELLED',
      });

      await service.cancel('company_1', 'entry_1', 'user_1', false);

      expect(prisma.financialEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'CANCELLED' } }),
      );
    });

    it('refuses to let someone other than the creator (or an admin) cancel', async () => {
      prisma.financialEntry.findFirst.mockResolvedValue({
        id: 'entry_1',
        companyId: 'company_1',
        createdByUserId: 'user_1',
        status: 'DRAFT',
      });

      await expect(
        service.cancel('company_1', 'entry_1', 'someone_else', false),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAllForCompany (visibility)', () => {
    it('gives FINANCEIRO/ADMIN unrestricted access without walking the hierarchy', async () => {
      prisma.financialEntry.findMany.mockResolvedValue([]);

      await service.findAllForCompany('company_1', 'finance_1', 'FINANCEIRO');

      expect(
        hierarchyAssignmentsService.getVisibleAssignmentIds,
      ).not.toHaveBeenCalled();
      expect(prisma.financialEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { companyId: 'company_1' } }),
      );
    });

    it('scopes a non-global role to entries they created or that fall in their visible subtree', async () => {
      prisma.hierarchyAssignment.findMany.mockResolvedValue([
        { id: 'assign_felipe' },
      ]);
      hierarchyAssignmentsService.getVisibleAssignmentIds.mockResolvedValue([
        'assign_felipe',
        'assign_pedro',
      ]);
      prisma.financialEntry.findMany.mockResolvedValue([]);

      await service.findAllForCompany('company_1', 'user_felipe', 'GERENTE');

      expect(prisma.financialEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { createdByUserId: 'user_felipe' },
              {
                provider: {
                  responsibleAssignmentId: {
                    in: ['assign_felipe', 'assign_pedro'],
                  },
                },
              },
            ],
          }) as Record<string, unknown>,
        }),
      );
    });
  });

  describe('findById (visibility)', () => {
    it('denies access to someone outside the creator and outside the visible subtree', async () => {
      prisma.financialEntry.findFirst.mockResolvedValue({
        id: 'entry_1',
        companyId: 'company_1',
        providerId: 'provider_1',
        createdByUserId: 'user_1',
        status: 'DRAFT',
        steps: [],
      });
      prisma.provider.findUnique.mockResolvedValue({
        responsibleAssignmentId: 'assign_pedro',
      });
      prisma.hierarchyAssignment.findMany.mockResolvedValue([
        { id: 'assign_ricardo' },
      ]);
      hierarchyAssignmentsService.getVisibleAssignmentIds.mockResolvedValue([
        'assign_ricardo',
        'assign_lucas',
      ]);

      await expect(
        service.findById('company_1', 'entry_1', 'user_ricardo', 'GERENTE'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows the creator to see their own entry even outside their subtree', async () => {
      const entry = {
        id: 'entry_1',
        companyId: 'company_1',
        providerId: 'provider_1',
        createdByUserId: 'user_1',
        status: 'DRAFT',
        steps: [],
      };
      prisma.financialEntry.findFirst.mockResolvedValue(entry);

      const result = await service.findById(
        'company_1',
        'entry_1',
        'user_1',
        'SUPERVISOR',
      );

      expect(result).toEqual(entry);
      expect(prisma.provider.findUnique).not.toHaveBeenCalled();
    });
  });
});
