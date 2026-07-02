import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CommercialAgreementsService } from './commercial-agreements.service';
import { ProvidersService } from './providers.service';

describe('CommercialAgreementsService', () => {
  let service: CommercialAgreementsService;
  let prisma: {
    commercialAgreement: {
      findFirst: jest.Mock;
      update: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
    };
  };
  let audit: { record: jest.Mock };
  let providersService: { findById: jest.Mock };

  const createDto = {
    type: 'HOURLY' as const,
    baseRate: 100,
    scopeDescription: 'Suporte técnico em campo',
    startDate: '2026-07-01',
  };

  beforeEach(() => {
    prisma = {
      commercialAgreement: {
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };
    audit = { record: jest.fn() };
    providersService = {
      findById: jest.fn().mockResolvedValue({ id: 'provider_1' }),
    };

    service = new CommercialAgreementsService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
      providersService as unknown as ProvidersService,
    );
  });

  describe('create', () => {
    it('creates the first agreement without superseding anything', async () => {
      prisma.commercialAgreement.findFirst.mockResolvedValue(null);
      const agreement = {
        id: 'agreement_1',
        type: 'HOURLY',
        baseRate: { toString: () => '100' },
      };
      prisma.commercialAgreement.create.mockResolvedValue(agreement);

      await service.create('company_1', 'provider_1', 'user_1', createDto);

      expect(prisma.commercialAgreement.update).not.toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'commercialAgreement.created' }),
      );
    });

    it('terminates the previous ACTIVE agreement before creating the new one', async () => {
      const previous = { id: 'agreement_old', status: 'ACTIVE', endDate: null };
      prisma.commercialAgreement.findFirst.mockResolvedValue(previous);
      prisma.commercialAgreement.update.mockResolvedValue({});
      const agreement = {
        id: 'agreement_new',
        type: 'HOURLY',
        baseRate: { toString: () => '100' },
      };
      prisma.commercialAgreement.create.mockResolvedValue(agreement);

      await service.create('company_1', 'provider_1', 'user_1', createDto);

      expect(prisma.commercialAgreement.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'agreement_old' },
          data: expect.objectContaining({ status: 'TERMINATED' }) as Record<
            string,
            unknown
          >,
        }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'commercialAgreement.superseded',
          entityId: 'agreement_old',
        }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'commercialAgreement.created',
          entityId: 'agreement_new',
        }),
      );
    });

    it('verifies the provider belongs to the company before creating', async () => {
      prisma.commercialAgreement.findFirst.mockResolvedValue(null);
      prisma.commercialAgreement.create.mockResolvedValue({
        id: 'agreement_1',
        baseRate: { toString: () => '100' },
      });

      await service.create('company_1', 'provider_1', 'user_1', createDto);

      expect(providersService.findById).toHaveBeenCalledWith(
        'company_1',
        'provider_1',
      );
    });
  });
});
