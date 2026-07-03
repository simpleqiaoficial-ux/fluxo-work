import { ConflictException } from '@nestjs/common';
import { ApprovalLevelsService } from './approval-levels.service';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ApprovalLevelsService', () => {
  let service: ApprovalLevelsService;
  let prisma: {
    approvalLevel: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    hierarchyAssignment: { findFirst: jest.Mock };
  };
  let audit: { record: jest.Mock };

  beforeEach(() => {
    prisma = {
      approvalLevel: {
        create: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      hierarchyAssignment: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    audit = { record: jest.fn() };

    service = new ApprovalLevelsService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
    );
  });

  describe('create', () => {
    it('rejects a duplicate order within the same company', async () => {
      prisma.approvalLevel.findUnique.mockResolvedValue({
        id: 'level_existing',
        order: 1,
      });

      await expect(
        service.create('company_1', 'admin_1', { name: 'Gerente', order: 1 }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.approvalLevel.create).not.toHaveBeenCalled();
    });

    it('creates the level when the order is free', async () => {
      prisma.approvalLevel.create.mockResolvedValue({
        id: 'level_1',
        name: 'Supervisor',
        order: 1,
      });

      await service.create('company_1', 'admin_1', {
        name: 'Supervisor',
        order: 1,
      });

      expect(prisma.approvalLevel.create).toHaveBeenCalledWith({
        data: { companyId: 'company_1', name: 'Supervisor', order: 1 },
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'approvalLevel.created' }),
      );
    });
  });

  describe('remove', () => {
    it('refuses to delete a level still assigned to someone in the hierarchy', async () => {
      prisma.approvalLevel.findFirst.mockResolvedValue({ id: 'level_1' });
      prisma.hierarchyAssignment.findFirst.mockResolvedValue({
        id: 'assign_1',
      });

      await expect(
        service.remove('company_1', 'level_1', 'admin_1'),
      ).rejects.toThrow(ConflictException);
      expect(prisma.approvalLevel.delete).not.toHaveBeenCalled();
    });
  });
});
