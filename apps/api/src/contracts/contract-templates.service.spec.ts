import { NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ContractTemplatesService } from './contract-templates.service';

describe('ContractTemplatesService', () => {
  let service: ContractTemplatesService;
  let prisma: {
    contractTemplate: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };
  let audit: { record: jest.Mock };

  const createDto = {
    name: 'Modelo padrão de suporte técnico',
    activityType: 'Suporte técnico',
    bodyTemplate:
      'Contrato entre {{company.legalName}} e {{provider.legalName}}.',
  };

  beforeEach(() => {
    prisma = {
      contractTemplate: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    audit = { record: jest.fn() };

    service = new ContractTemplatesService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
    );
  });

  describe('create', () => {
    it('creates the template and records an audit event', async () => {
      const template = { id: 'template_1', ...createDto };
      prisma.contractTemplate.create.mockResolvedValue(template);

      const result = await service.create('company_1', 'user_1', createDto);

      expect(prisma.contractTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: 'company_1',
            name: createDto.name,
          }) as Record<string, unknown>,
        }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'contractTemplate.created',
          companyId: 'company_1',
        }),
      );
      expect(result).toBe(template);
    });
  });

  describe('findById', () => {
    it('throws NotFoundException when the template does not exist in the company', async () => {
      prisma.contractTemplate.findFirst.mockResolvedValue(null);
      await expect(service.findById('company_1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
