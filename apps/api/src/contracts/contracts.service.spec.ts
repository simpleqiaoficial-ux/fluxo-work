import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProvidersService } from '../providers/providers.service';
import { ContractTemplatesService } from './contract-templates.service';
import { ContractsService } from './contracts.service';

describe('ContractsService', () => {
  let service: ContractsService;
  let prisma: {
    contract: {
      findFirst: jest.Mock;
      update: jest.Mock<
        Promise<unknown>,
        [{ where: { id: string }; data: Record<string, unknown> }]
      >;
      create: jest.Mock;
      findMany: jest.Mock;
    };
    commercialAgreement: { findFirst: jest.Mock };
    company: { findUniqueOrThrow: jest.Mock };
  };
  let audit: { record: jest.Mock };
  let providersService: { findById: jest.Mock };
  let contractTemplatesService: { findById: jest.Mock };

  const template = {
    id: 'template_1',
    bodyTemplate:
      'Contrato entre {{company.legalName}} e {{provider.legalName}}.',
  };
  const provider = { id: 'provider_1', legalName: 'Fulano LTDA' };
  const company = { id: 'company_1', legalName: 'Acme SA' };

  beforeEach(() => {
    prisma = {
      contract: {
        findFirst: jest.fn(),
        update: jest.fn<
          Promise<unknown>,
          [{ where: { id: string }; data: Record<string, unknown> }]
        >(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
      commercialAgreement: { findFirst: jest.fn() },
      company: { findUniqueOrThrow: jest.fn().mockResolvedValue(company) },
    };
    audit = { record: jest.fn() };
    providersService = { findById: jest.fn().mockResolvedValue(provider) };
    contractTemplatesService = {
      findById: jest.fn().mockResolvedValue(template),
    };

    service = new ContractsService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
      providersService as unknown as ProvidersService,
      contractTemplatesService as unknown as ContractTemplatesService,
    );
  });

  describe('create', () => {
    it('renders the template and creates version 1 without superseding anything', async () => {
      prisma.commercialAgreement.findFirst.mockResolvedValue(null);
      prisma.contract.findFirst.mockResolvedValue(null);
      prisma.contract.create.mockResolvedValue({
        id: 'contract_1',
        version: 1,
      });

      await service.create('company_1', 'provider_1', 'user_1', {
        templateId: 'template_1',
      });

      expect(prisma.contract.update).not.toHaveBeenCalled();
      expect(prisma.contract.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            version: 1,
            status: 'ACTIVE',
            content: 'Contrato entre Acme SA e Fulano LTDA.',
          }) as Record<string, unknown>,
        }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'contract.created' }),
      );
    });

    it('supersedes the previous ACTIVE contract and increments the version', async () => {
      prisma.commercialAgreement.findFirst.mockResolvedValue(null);
      const previous = { id: 'contract_old', status: 'ACTIVE', version: 1 };
      prisma.contract.findFirst.mockResolvedValue(previous);
      prisma.contract.update.mockResolvedValue({});
      prisma.contract.create.mockResolvedValue({
        id: 'contract_new',
        version: 2,
      });

      await service.create('company_1', 'provider_1', 'user_1', {
        templateId: 'template_1',
      });

      expect(prisma.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'contract_old' },
          data: expect.objectContaining({ status: 'SUPERSEDED' }) as Record<
            string,
            unknown
          >,
        }),
      );
      expect(prisma.contract.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ version: 2 }) as Record<
            string,
            unknown
          >,
        }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'contract.superseded',
          entityId: 'contract_old',
        }),
      );
    });
  });

  describe('updateSignature', () => {
    it('sets signedAt when marking as SIGNED', async () => {
      prisma.contract.findFirst.mockResolvedValue({
        id: 'contract_1',
        signatureStatus: 'PENDING',
      });
      prisma.contract.update.mockResolvedValue({
        id: 'contract_1',
        signatureStatus: 'SIGNED',
      });

      await service.updateSignature(
        'company_1',
        'provider_1',
        'contract_1',
        'user_1',
        {
          signatureStatus: 'SIGNED',
        },
      );

      expect(prisma.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            signatureStatus: 'SIGNED',
          }) as Record<string, unknown>,
        }),
      );
      const updateCall = prisma.contract.update.mock.calls[0][0];
      expect(updateCall.data.signedAt).toBeInstanceOf(Date);
    });
  });
});
