import { HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthRateLimiterService } from './auth-rate-limiter.service';

describe('AuthRateLimiterService', () => {
  let service: AuthRateLimiterService;
  let prisma: {
    authAttempt: {
      findUnique: jest.Mock;
      upsert: jest.Mock<Promise<unknown>, [Record<string, unknown>]>;
      update: jest.Mock<Promise<unknown>, [Record<string, unknown>]>;
      deleteMany: jest.Mock;
    };
  };

  const options = { maxAttempts: 3, windowMs: 60_000, blockMs: 60_000 };

  beforeEach(() => {
    prisma = {
      authAttempt: {
        findUnique: jest.fn(),
        upsert: jest.fn<Promise<unknown>, [Record<string, unknown>]>(),
        update: jest.fn<Promise<unknown>, [Record<string, unknown>]>(),
        deleteMany: jest.fn(),
      },
    };
    service = new AuthRateLimiterService(prisma as unknown as PrismaService);
  });

  describe('assertNotBlocked', () => {
    it('does nothing when there is no record for the key', async () => {
      prisma.authAttempt.findUnique.mockResolvedValue(null);
      await expect(service.assertNotBlocked('key')).resolves.toBeUndefined();
    });

    it('does nothing when blockedUntil is already in the past', async () => {
      prisma.authAttempt.findUnique.mockResolvedValue({
        blockedUntil: new Date(Date.now() - 1000),
      });
      await expect(service.assertNotBlocked('key')).resolves.toBeUndefined();
    });

    it('throws 429 while the key is currently blocked', async () => {
      prisma.authAttempt.findUnique.mockResolvedValue({
        blockedUntil: new Date(Date.now() + 60_000),
      });

      await expect(service.assertNotBlocked('key')).rejects.toThrow(
        HttpException,
      );
      prisma.authAttempt.findUnique.mockResolvedValue({
        blockedUntil: new Date(Date.now() + 60_000),
      });
      await expect(service.assertNotBlocked('key')).rejects.toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
      });
    });
  });

  describe('registerAttempt', () => {
    it('starts a fresh window when there is no prior record', async () => {
      prisma.authAttempt.findUnique.mockResolvedValue(null);

      await service.registerAttempt('key', options);

      const call = prisma.authAttempt.upsert.mock.calls[0][0] as {
        where: { key: string };
        create: { key: string; count: number };
      };
      expect(call.where).toEqual({ key: 'key' });
      expect(call.create).toEqual(
        expect.objectContaining({ key: 'key', count: 1 }),
      );
    });

    it('starts a fresh window when the previous one already expired', async () => {
      prisma.authAttempt.findUnique.mockResolvedValue({
        count: 3,
        firstAttemptAt: new Date(Date.now() - options.windowMs - 1000),
        blockedUntil: null,
      });

      await service.registerAttempt('key', options);

      const call = prisma.authAttempt.upsert.mock.calls[0][0] as {
        update: { count: number; blockedUntil: null };
      };
      expect(call.update).toEqual(
        expect.objectContaining({ count: 1, blockedUntil: null }),
      );
    });

    it('increments the counter within the window without blocking below the threshold', async () => {
      prisma.authAttempt.findUnique.mockResolvedValue({
        count: 1,
        firstAttemptAt: new Date(),
        blockedUntil: null,
      });

      await service.registerAttempt('key', options);

      const call = prisma.authAttempt.update.mock.calls[0][0] as {
        where: { key: string };
        data: { count: number; blockedUntil: null };
      };
      expect(call.where).toEqual({ key: 'key' });
      expect(call.data).toEqual(
        expect.objectContaining({ count: 2, blockedUntil: null }),
      );
    });

    it('blocks and throws 429 once the configured threshold is reached', async () => {
      prisma.authAttempt.findUnique.mockResolvedValue({
        count: 2,
        firstAttemptAt: new Date(),
        blockedUntil: null,
      });

      await expect(service.registerAttempt('key', options)).rejects.toThrow(
        HttpException,
      );
      const call = prisma.authAttempt.update.mock.calls[0][0] as {
        data: { count: number };
      };
      expect(call.data).toEqual(expect.objectContaining({ count: 3 }));
    });
  });

  describe('reset', () => {
    it('deletes the counter for the key', async () => {
      await service.reset('key');
      expect(prisma.authAttempt.deleteMany).toHaveBeenCalledWith({
        where: { key: 'key' },
      });
    });
  });
});
