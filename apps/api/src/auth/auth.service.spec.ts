import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { hashPassword } from './password.util';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      create: jest.Mock<Promise<unknown>, [{ data: Record<string, unknown> }]>;
    };
    membership: { findUnique: jest.Mock };
    refreshToken: {
      create: jest.Mock<Promise<unknown>, [{ data: Record<string, unknown> }]>;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let audit: { record: jest.Mock };

  const fakeUser = {
    id: 'user_1',
    passwordHash: 'salt:hash',
    email: 'a@b.com',
    name: 'A B',
    avatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn<
          Promise<unknown>,
          [{ data: Record<string, unknown> }]
        >(),
      },
      membership: { findUnique: jest.fn() },
      refreshToken: {
        create: jest.fn<
          Promise<unknown>,
          [{ data: Record<string, unknown> }]
        >(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    audit = { record: jest.fn() };

    const jwt = new JwtService({ secret: 'test-secret' });
    const config = new ConfigService({
      JWT_ACCESS_SECRET: 'test-secret',
      JWT_ACCESS_TTL: '15m',
      REFRESH_TOKEN_TTL_DAYS: '30',
    });

    service = new AuthService(
      prisma as unknown as PrismaService,
      jwt,
      config,
      audit as unknown as AuditService,
    );
  });

  describe('register', () => {
    it('rejects when a user with that e-mail already exists', async () => {
      prisma.user.findUnique.mockResolvedValue(fakeUser);

      await expect(
        service.register('A B', 'a@b.com', 'password123'),
      ).rejects.toThrow(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('creates a new user with a hashed password and records an audit event', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(fakeUser);

      const result = await service.register('A B', 'a@b.com', 'password123');

      expect(result).toEqual(fakeUser);
      const createCall = prisma.user.create.mock.calls[0][0];
      expect(createCall.data.passwordHash).not.toBe('password123');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'user.created',
          entityId: fakeUser.id,
        }),
      );
    });
  });

  describe('validateCredentials', () => {
    it('rejects when no user exists for the e-mail', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.validateCredentials('a@b.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects when the password does not match', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...fakeUser,
        passwordHash: await hashPassword('correct-password'),
      });

      await expect(
        service.validateCredentials('a@b.com', 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns the user when the password matches', async () => {
      const stored = {
        ...fakeUser,
        passwordHash: await hashPassword('correct-password'),
      };
      prisma.user.findUnique.mockResolvedValue(stored);

      const result = await service.validateCredentials(
        'a@b.com',
        'correct-password',
      );

      expect(result).toEqual(stored);
    });
  });

  describe('issueTokenPair', () => {
    it('signs an access token scoped to the given membership and persists a hashed refresh token', async () => {
      prisma.refreshToken.create.mockResolvedValue({});
      const membership = {
        id: 'm_1',
        userId: fakeUser.id,
        companyId: 'company_1',
        role: 'ADMIN' as const,
        status: 'ACTIVE' as const,
      };

      const tokens = await service.issueTokenPair(
        fakeUser,
        membership as never,
      );

      expect(tokens.accessToken).toEqual(expect.any(String));
      expect(tokens.refreshToken).toHaveLength(96);
      const createCall = prisma.refreshToken.create.mock.calls[0][0];
      expect(createCall.data.tokenHash).not.toEqual(tokens.refreshToken);
      expect(createCall.data.companyId).toBe('company_1');
    });
  });

  describe('rotateRefreshToken', () => {
    it('rejects an unknown or already-revoked token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.rotateRefreshToken('bogus')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects an expired token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt_1',
        userId: fakeUser.id,
        companyId: null,
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(service.rotateRefreshToken('expired')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rotates a valid token and revokes the old one', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt_1',
        userId: fakeUser.id,
        companyId: null,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 100000),
      });
      prisma.user.findUniqueOrThrow.mockResolvedValue(fakeUser);
      prisma.refreshToken.update.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});

      const tokens = await service.rotateRefreshToken('valid');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'rt_1' } }),
      );
      expect(tokens.accessToken).toEqual(expect.any(String));
    });

    it('rejects rotation when the membership behind a company-scoped token was revoked', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt_1',
        userId: fakeUser.id,
        companyId: 'company_1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 100000),
      });
      prisma.user.findUniqueOrThrow.mockResolvedValue(fakeUser);
      prisma.membership.findUnique.mockResolvedValue({ status: 'REVOKED' });

      await expect(service.rotateRefreshToken('valid')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('selectCompany', () => {
    it('rejects when the user has no active membership on that company', async () => {
      prisma.membership.findUnique.mockResolvedValue(null);
      await expect(
        service.selectCompany(fakeUser.id, 'company_1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('issues scoped tokens when the membership is active', async () => {
      prisma.membership.findUnique.mockResolvedValue({
        id: 'm_1',
        userId: fakeUser.id,
        companyId: 'company_1',
        role: 'ADMIN',
        status: 'ACTIVE',
      });
      prisma.user.findUniqueOrThrow.mockResolvedValue(fakeUser);
      prisma.refreshToken.create.mockResolvedValue({});

      const tokens = await service.selectCompany(fakeUser.id, 'company_1');
      expect(tokens.accessToken).toEqual(expect.any(String));
    });
  });
});
