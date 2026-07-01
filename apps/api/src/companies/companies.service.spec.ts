import { ConflictException, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CompaniesService } from './companies.service';

describe('CompaniesService', () => {
  let service: CompaniesService;
  let prisma: {
    company: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    membership: { create: jest.Mock };
  };
  let audit: { record: jest.Mock };

  const validCnpj = '11444777000161'; // dígitos verificadores válidos

  beforeEach(() => {
    prisma = {
      company: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      membership: { create: jest.fn() },
    };
    audit = { record: jest.fn() };

    service = new CompaniesService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
    );
  });

  describe('createWithAdmin', () => {
    it('rejects when a company with the same CNPJ already exists', async () => {
      prisma.company.findUnique.mockResolvedValue({ id: 'company_1' });

      await expect(
        service.createWithAdmin('user_1', { legalName: 'X', cnpj: validCnpj }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.company.create).not.toHaveBeenCalled();
    });

    it('creates the company and an ACTIVE ADMIN membership for the caller', async () => {
      prisma.company.findUnique.mockResolvedValue(null);
      const company = { id: 'company_1', legalName: 'X', cnpj: validCnpj };
      prisma.company.create.mockResolvedValue(company);
      const membership = {
        id: 'm_1',
        userId: 'user_1',
        companyId: 'company_1',
        role: 'ADMIN',
      };
      prisma.membership.create.mockResolvedValue(membership);

      const result = await service.createWithAdmin('user_1', {
        legalName: 'X',
        cnpj: validCnpj,
      });

      expect(prisma.membership.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: 'ADMIN',
            status: 'ACTIVE',
            userId: 'user_1',
          }) as Record<string, unknown>,
        }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'company.created',
          companyId: 'company_1',
        }),
      );
      expect(result.company).toBe(company);
      expect(result.membership).toBe(membership);
    });
  });

  describe('findById', () => {
    it('throws NotFoundException when the company does not exist', async () => {
      prisma.company.findUnique.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
