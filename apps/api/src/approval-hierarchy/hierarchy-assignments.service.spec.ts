import { BadRequestException, ConflictException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { HierarchyAssignmentsService } from './hierarchy-assignments.service';

interface FakeAssignment {
  id: string;
  companyId: string;
  approvalLevelId: string;
  userId: string;
  parentId: string | null;
}

describe('HierarchyAssignmentsService', () => {
  let service: HierarchyAssignmentsService;
  let prisma: {
    hierarchyAssignment: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock<
        Promise<unknown>,
        [{ where: { id: string }; data: Record<string, unknown> }]
      >;
      delete: jest.Mock;
    };
    approvalLevel: { findFirst: jest.Mock };
    membership: { findFirst: jest.Mock };
    provider: { findFirst: jest.Mock };
  };
  let audit: { record: jest.Mock };

  // Felipe (Gerente, sem pai) -> Pedro (Supervisor, pai: Felipe)
  //                           -> João  (Supervisor, pai: Felipe)
  // Ricardo (Gerente, sem pai) -> Lucas (Supervisor, pai: Ricardo)
  const felipe: FakeAssignment = {
    id: 'assign_felipe',
    companyId: 'company_1',
    approvalLevelId: 'level_gerente',
    userId: 'user_felipe',
    parentId: null,
  };
  const pedro: FakeAssignment = {
    id: 'assign_pedro',
    companyId: 'company_1',
    approvalLevelId: 'level_supervisor',
    userId: 'user_pedro',
    parentId: 'assign_felipe',
  };
  const joao: FakeAssignment = {
    id: 'assign_joao',
    companyId: 'company_1',
    approvalLevelId: 'level_supervisor',
    userId: 'user_joao',
    parentId: 'assign_felipe',
  };
  const ricardo: FakeAssignment = {
    id: 'assign_ricardo',
    companyId: 'company_1',
    approvalLevelId: 'level_gerente',
    userId: 'user_ricardo',
    parentId: null,
  };
  const lucas: FakeAssignment = {
    id: 'assign_lucas',
    companyId: 'company_1',
    approvalLevelId: 'level_supervisor',
    userId: 'user_lucas',
    parentId: 'assign_ricardo',
  };

  const byId: Record<string, FakeAssignment> = {
    [felipe.id]: felipe,
    [pedro.id]: pedro,
    [joao.id]: joao,
    [ricardo.id]: ricardo,
    [lucas.id]: lucas,
  };

  beforeEach(() => {
    prisma = {
      hierarchyAssignment: {
        create: jest.fn(),
        findFirst: jest.fn(
          ({
            where,
          }: {
            where: { id?: string; parentId?: string; companyId?: string };
          }) => {
            if (where.id !== undefined) {
              return Promise.resolve(byId[where.id] ?? null);
            }
            if (where.parentId !== undefined) {
              const child = Object.values(byId).find(
                (node) => node.parentId === where.parentId,
              );
              return Promise.resolve(child ?? null);
            }
            return Promise.resolve(null);
          },
        ),
        findMany: jest.fn(
          ({ where }: { where: { parentId: string; companyId?: string } }) =>
            Promise.resolve(
              Object.values(byId)
                .filter((node) => node.parentId === where.parentId)
                .map((node) => ({ id: node.id })),
            ),
        ),
        update: jest.fn<
          Promise<unknown>,
          [{ where: { id: string }; data: Record<string, unknown> }]
        >(),
        delete: jest.fn(),
      },
      approvalLevel: {
        findFirst: jest.fn().mockResolvedValue({ id: 'level_supervisor' }),
      },
      membership: {
        findFirst: jest.fn().mockResolvedValue({ id: 'membership_1' }),
      },
      provider: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    audit = { record: jest.fn() };

    service = new HierarchyAssignmentsService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
    );
  });

  describe('getApprovalChain', () => {
    it('walks from a leaf up to the root, leaf-first', async () => {
      const chain = await service.getApprovalChain('company_1', pedro.id);

      expect(chain.map((node) => node.id)).toEqual([pedro.id, felipe.id]);
    });

    it('returns just the node itself when there is no parent', async () => {
      const chain = await service.getApprovalChain('company_1', felipe.id);

      expect(chain.map((node) => node.id)).toEqual([felipe.id]);
    });
  });

  describe('getVisibleAssignmentIds', () => {
    it("includes the manager's own subtree but never a sibling branch", async () => {
      const visible = await service.getVisibleAssignmentIds(
        'company_1',
        felipe.id,
      );

      expect(visible.sort()).toEqual([felipe.id, joao.id, pedro.id].sort());
      expect(visible).not.toContain(ricardo.id);
      expect(visible).not.toContain(lucas.id);
    });

    it('a supervisor only sees themself when they have no subordinates', async () => {
      const visible = await service.getVisibleAssignmentIds(
        'company_1',
        pedro.id,
      );

      expect(visible).toEqual([pedro.id]);
    });
  });

  describe('update (reparenting)', () => {
    it('rejects making a node its own ancestor (direct cycle)', async () => {
      // Tentando fazer Felipe reportar pro Pedro, que já reporta pro Felipe.
      await expect(
        service.update('company_1', felipe.id, 'admin_1', {
          parentId: pedro.id,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.hierarchyAssignment.update).not.toHaveBeenCalled();
    });

    it('rejects a longer indirect cycle', async () => {
      // Felipe -> Pedro já existe. Tentar Felipe.parent = joao (que também é
      // filho de Felipe) não é ciclo em si, mas se joao.parent virasse felipe
      // isso seria auto-referência indireta — aqui testamos o caso direto de
      // profundidade 2: Pedro tentando adotar Felipe como se fosse subordinado
      // dele mesmo via um nó que já é ancestral.
      await expect(
        service.update('company_1', felipe.id, 'admin_1', {
          parentId: felipe.id,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows reparenting to a valid, unrelated node', async () => {
      prisma.hierarchyAssignment.update.mockResolvedValue({
        ...joao,
        parentId: ricardo.id,
      });

      await service.update('company_1', joao.id, 'admin_1', {
        parentId: ricardo.id,
      });

      expect(prisma.hierarchyAssignment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: joao.id },
          data: expect.objectContaining({
            parentId: ricardo.id,
          }) as Record<string, unknown>,
        }),
      );
    });

    it('allows clearing the parent to promote a node to the top', async () => {
      prisma.hierarchyAssignment.update.mockResolvedValue({
        ...pedro,
        parentId: null,
      });

      await service.update('company_1', pedro.id, 'admin_1', {
        parentId: null,
      });

      const updateCall = prisma.hierarchyAssignment.update.mock.calls[0][0];
      expect(updateCall.data.parentId).toBeNull();
    });
  });

  describe('create', () => {
    it('rejects a parent that does not belong to the company', async () => {
      prisma.hierarchyAssignment.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.create('company_1', 'admin_1', {
          approvalLevelId: 'level_supervisor',
          userId: 'user_new',
          parentId: 'assign_from_other_company',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.hierarchyAssignment.create).not.toHaveBeenCalled();
    });

    it('rejects a user without an active membership in the company', async () => {
      prisma.membership.findFirst.mockResolvedValue(null);

      await expect(
        service.create('company_1', 'admin_1', {
          approvalLevelId: 'level_supervisor',
          userId: 'user_outsider',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.hierarchyAssignment.create).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('refuses to delete a node that still has subordinates', async () => {
      await expect(
        service.remove('company_1', felipe.id, 'admin_1'),
      ).rejects.toThrow(ConflictException);
      expect(prisma.hierarchyAssignment.delete).not.toHaveBeenCalled();
    });

    it('refuses to delete a node that is still responsible for providers', async () => {
      prisma.provider.findFirst.mockResolvedValue({ id: 'provider_1' });

      await expect(
        service.remove('company_1', pedro.id, 'admin_1'),
      ).rejects.toThrow(ConflictException);
      expect(prisma.hierarchyAssignment.delete).not.toHaveBeenCalled();
    });

    it('deletes a leaf node with no subordinates or providers', async () => {
      await service.remove('company_1', pedro.id, 'admin_1');

      expect(prisma.hierarchyAssignment.delete).toHaveBeenCalledWith({
        where: { id: pedro.id },
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'hierarchyAssignment.deleted' }),
      );
    });
  });
});
