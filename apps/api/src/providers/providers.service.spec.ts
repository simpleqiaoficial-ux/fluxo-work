import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProvidersService } from './providers.service';

describe('ProvidersService', () => {
  let service: ProvidersService;
  let prisma: {
    provider: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let audit: { record: jest.Mock };
  let cnpjLookup: { lookup: jest.Mock };

  const validCnpj = '11444777000161';

  beforeEach(() => {
    prisma = {
      provider: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    audit = { record: jest.fn() };
    cnpjLookup = { lookup: jest.fn() };

    service = new ProvidersService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
      cnpjLookup,
    );
  });

  const createDto = {
    cnpj: validCnpj,
    legalName: 'Fulano Serviços LTDA',
    contactName: 'Fulano de Tal',
    cpf: '12345678900',
  };

  describe('create', () => {
    it('rejects when the CNPJ lookup reports it as invalid', async () => {
      cnpjLookup.lookup.mockResolvedValue({
        cnpj: validCnpj,
        valid: false,
        source: 'structural-only',
      });

      await expect(
        service.create('company_1', 'user_1', createDto),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.provider.create).not.toHaveBeenCalled();
    });

    it('rejects when a provider with the same CNPJ already exists in the company', async () => {
      cnpjLookup.lookup.mockResolvedValue({
        cnpj: validCnpj,
        valid: true,
        source: 'structural-only',
      });
      prisma.provider.findUnique.mockResolvedValue({ id: 'provider_1' });

      await expect(
        service.create('company_1', 'user_1', createDto),
      ).rejects.toThrow(ConflictException);
      expect(prisma.provider.create).not.toHaveBeenCalled();
    });

    it('creates the provider and records an audit event', async () => {
      cnpjLookup.lookup.mockResolvedValue({
        cnpj: validCnpj,
        valid: true,
        source: 'structural-only',
      });
      prisma.provider.findUnique.mockResolvedValue(null);
      const provider = {
        id: 'provider_1',
        cnpj: validCnpj,
        legalName: createDto.legalName,
      };
      prisma.provider.create.mockResolvedValue(provider);

      const result = await service.create('company_1', 'user_1', createDto);

      expect(prisma.provider.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: 'company_1',
            cnpj: validCnpj,
          }) as Record<string, unknown>,
        }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'provider.created',
          companyId: 'company_1',
        }),
      );
      expect(result).toBe(provider);
    });
  });

  describe('findById', () => {
    it('throws NotFoundException when the provider does not exist in the company', async () => {
      prisma.provider.findFirst.mockResolvedValue(null);
      await expect(service.findById('company_1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
