import { BadRequestException, ConflictException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProvidersService } from '../providers/providers.service';
import { ServiceOrderDecision } from './dto/service-order-decision.enum';
import { ServiceOrdersService } from './service-orders.service';

describe('ServiceOrdersService', () => {
  let service: ServiceOrdersService;
  let prisma: {
    serviceOrder: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock<
        Promise<unknown>,
        [{ where: { id: string }; data: Record<string, unknown> }]
      >;
    };
    commercialAgreement: { findFirst: jest.Mock };
  };
  let audit: { record: jest.Mock };
  let providersService: { findById: jest.Mock };

  const provider = { id: 'provider_1' };

  beforeEach(() => {
    prisma = {
      serviceOrder: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn<
          Promise<unknown>,
          [{ where: { id: string }; data: Record<string, unknown> }]
        >(),
      },
      commercialAgreement: { findFirst: jest.fn() },
    };
    audit = { record: jest.fn() };
    providersService = { findById: jest.fn().mockResolvedValue(provider) };

    service = new ServiceOrdersService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
      providersService as unknown as ProvidersService,
    );
  });

  describe('create', () => {
    it('validates the provider belongs to the company and defaults optional values to 0', async () => {
      prisma.serviceOrder.create.mockResolvedValue({
        id: 'order_1',
        status: 'PENDING_MANAGER_APPROVAL',
        providerId: 'provider_1',
      });

      await service.create('company_1', 'user_1', {
        providerId: 'provider_1',
        description: 'Consultoria',
        baseValue: 1000,
      });

      expect(providersService.findById).toHaveBeenCalledWith(
        'company_1',
        'provider_1',
      );
      expect(prisma.serviceOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bonus: 0,
            commission: 0,
            additionals: 0,
            reimbursements: 0,
            createdByUserId: 'user_1',
          }) as Record<string, unknown>,
        }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'serviceOrder.created' }),
      );
    });

    it('rejects a commercial agreement that does not belong to the provider', async () => {
      prisma.commercialAgreement.findFirst.mockResolvedValue(null);

      await expect(
        service.create('company_1', 'user_1', {
          providerId: 'provider_1',
          commercialAgreementId: 'agreement_other_provider',
          description: 'Consultoria',
          baseValue: 1000,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.serviceOrder.create).not.toHaveBeenCalled();
    });
  });

  describe('managerDecision', () => {
    it('moves to PENDING_FINANCE_APPROVAL on approve', async () => {
      prisma.serviceOrder.findFirst.mockResolvedValue({
        id: 'order_1',
        status: 'PENDING_MANAGER_APPROVAL',
      });
      prisma.serviceOrder.update.mockResolvedValue({
        id: 'order_1',
        status: 'PENDING_FINANCE_APPROVAL',
      });

      await service.managerDecision('company_1', 'order_1', 'manager_1', {
        decision: ServiceOrderDecision.APPROVE,
      });

      expect(prisma.serviceOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PENDING_FINANCE_APPROVAL',
            managerDecisionByUserId: 'manager_1',
          }) as Record<string, unknown>,
        }),
      );
    });

    it('requires a note to reject', async () => {
      prisma.serviceOrder.findFirst.mockResolvedValue({
        id: 'order_1',
        status: 'PENDING_MANAGER_APPROVAL',
      });

      await expect(
        service.managerDecision('company_1', 'order_1', 'manager_1', {
          decision: ServiceOrderDecision.REJECT,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.serviceOrder.update).not.toHaveBeenCalled();
    });

    it('requires a note to request adjustment, and moves to ADJUSTMENT_REQUESTED once given', async () => {
      prisma.serviceOrder.findFirst.mockResolvedValue({
        id: 'order_1',
        status: 'PENDING_MANAGER_APPROVAL',
      });
      prisma.serviceOrder.update.mockResolvedValue({
        id: 'order_1',
        status: 'ADJUSTMENT_REQUESTED',
      });

      await service.managerDecision('company_1', 'order_1', 'manager_1', {
        decision: ServiceOrderDecision.REQUEST_ADJUSTMENT,
        note: 'Falta detalhar o escopo',
      });

      expect(prisma.serviceOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'ADJUSTMENT_REQUESTED',
            managerDecisionNote: 'Falta detalhar o escopo',
          }) as Record<string, unknown>,
        }),
      );
    });

    it('rejects a decision when the order is not awaiting manager approval', async () => {
      prisma.serviceOrder.findFirst.mockResolvedValue({
        id: 'order_1',
        status: 'PENDING_FINANCE_APPROVAL',
      });

      await expect(
        service.managerDecision('company_1', 'order_1', 'manager_1', {
          decision: ServiceOrderDecision.APPROVE,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('financeDecision', () => {
    it('moves to APPROVED on approve and can apply a value adjustment', async () => {
      prisma.serviceOrder.findFirst.mockResolvedValue({
        id: 'order_1',
        status: 'PENDING_FINANCE_APPROVAL',
        adjustments: { toString: () => '0' },
      });
      prisma.serviceOrder.update.mockResolvedValue({
        id: 'order_1',
        status: 'APPROVED',
        adjustments: { toString: () => '-50' },
      });

      await service.financeDecision('company_1', 'order_1', 'finance_1', {
        decision: ServiceOrderDecision.APPROVE,
        adjustments: -50,
      });

      expect(prisma.serviceOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'APPROVED',
            adjustments: -50,
          }) as Record<string, unknown>,
        }),
      );
    });

    it('ignores the adjustments field when rejecting (note still required)', async () => {
      prisma.serviceOrder.findFirst.mockResolvedValue({
        id: 'order_1',
        status: 'PENDING_FINANCE_APPROVAL',
        adjustments: { toString: () => '0' },
      });
      prisma.serviceOrder.update.mockResolvedValue({
        id: 'order_1',
        status: 'REJECTED',
        adjustments: { toString: () => '0' },
      });

      await service.financeDecision('company_1', 'order_1', 'finance_1', {
        decision: ServiceOrderDecision.REJECT,
        note: 'Fora do orçamento aprovado',
        adjustments: -999,
      });

      const updateCall = prisma.serviceOrder.update.mock.calls[0][0];
      expect(updateCall.data.adjustments).toBeUndefined();
      expect(updateCall.data.status).toBe('REJECTED');
    });

    it('rejects a decision when the order is not awaiting finance approval', async () => {
      prisma.serviceOrder.findFirst.mockResolvedValue({
        id: 'order_1',
        status: 'PENDING_MANAGER_APPROVAL',
      });

      await expect(
        service.financeDecision('company_1', 'order_1', 'finance_1', {
          decision: ServiceOrderDecision.APPROVE,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update (resubmit)', () => {
    it('resets ADJUSTMENT_REQUESTED back to PENDING_MANAGER_APPROVAL', async () => {
      prisma.serviceOrder.findFirst.mockResolvedValue({
        id: 'order_1',
        status: 'ADJUSTMENT_REQUESTED',
        providerId: 'provider_1',
      });
      prisma.serviceOrder.update.mockResolvedValue({
        id: 'order_1',
        status: 'PENDING_MANAGER_APPROVAL',
      });

      await service.update('company_1', 'order_1', 'user_1', {
        description: 'Escopo revisado',
      });

      expect(prisma.serviceOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PENDING_MANAGER_APPROVAL',
          }) as Record<string, unknown>,
        }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'serviceOrder.resubmitted' }),
      );
    });

    it('rejects edits once the order has moved past manager review', async () => {
      prisma.serviceOrder.findFirst.mockResolvedValue({
        id: 'order_1',
        status: 'PENDING_FINANCE_APPROVAL',
        providerId: 'provider_1',
      });

      await expect(
        service.update('company_1', 'order_1', 'user_1', {
          description: 'Tentando editar tarde demais',
        }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.serviceOrder.update).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('cancels an order pending manager approval', async () => {
      prisma.serviceOrder.findFirst.mockResolvedValue({
        id: 'order_1',
        status: 'PENDING_MANAGER_APPROVAL',
      });
      prisma.serviceOrder.update.mockResolvedValue({
        id: 'order_1',
        status: 'CANCELLED',
      });

      await service.cancel('company_1', 'order_1', 'user_1');

      expect(prisma.serviceOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'CANCELLED' },
        }),
      );
    });

    it.each(['APPROVED', 'REJECTED', 'CANCELLED'])(
      'rejects cancelling an order already in a terminal state (%s)',
      async (status) => {
        prisma.serviceOrder.findFirst.mockResolvedValue({
          id: 'order_1',
          status,
        });

        await expect(
          service.cancel('company_1', 'order_1', 'user_1'),
        ).rejects.toThrow(ConflictException);
        expect(prisma.serviceOrder.update).not.toHaveBeenCalled();
      },
    );
  });
});
