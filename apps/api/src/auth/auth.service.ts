import { randomBytes, createHash } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Membership, User } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AccessTokenPayload } from './interfaces/access-token-payload.interface';
import { hashPassword, verifyPassword } from './password.util';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async register(name: string, email: string, password: string): Promise<User> {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Já existe uma conta com este e-mail');
    }

    const passwordHash = await hashPassword(password);
    const user = await this.prisma.user.create({
      data: { name, email, passwordHash },
    });

    await this.audit.record({
      action: 'user.created',
      entityType: 'User',
      entityId: user.id,
      actorUserId: user.id,
    });

    return user;
  }

  async validateCredentials(email: string, password: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }
    return user;
  }

  findActiveMemberships(userId: string) {
    return this.prisma.membership.findMany({
      where: { userId, status: 'ACTIVE' },
      include: { company: true },
    });
  }

  async issueTokenPair(
    user: User,
    membership: Membership | null,
    meta: RequestMeta = {},
  ): Promise<TokenPair> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      companyId: membership?.companyId,
      membershipId: membership?.id,
      role: membership?.role,
    };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      // `ms`'s StringValue type only accepts literal patterns it can statically vet;
      // this value comes from env config, so it can't be narrowed further than `string`.
      expiresIn: (this.config.get<string>('JWT_ACCESS_TTL') ?? '15m') as never,
    });

    const rawRefreshToken = randomBytes(48).toString('hex');
    const ttlDays = Number(
      this.config.get<string>('REFRESH_TOKEN_TTL_DAYS') ?? '30',
    );
    const refreshTokenExpiresAt = new Date(
      Date.now() + ttlDays * 24 * 60 * 60 * 1000,
    );

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        companyId: membership?.companyId,
        role: membership?.role,
        tokenHash: hashToken(rawRefreshToken),
        userAgent: meta.userAgent,
        ip: meta.ip,
        expiresAt: refreshTokenExpiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      refreshTokenExpiresAt,
    };
  }

  async rotateRefreshToken(
    rawToken: string,
    meta: RequestMeta = {},
  ): Promise<TokenPair> {
    const tokenHash = hashToken(rawToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: stored.userId },
    });
    const membership = stored.companyId
      ? await this.prisma.membership.findUnique({
          where: {
            userId_companyId: { userId: user.id, companyId: stored.companyId },
          },
        })
      : null;

    if (stored.companyId && (!membership || membership.status !== 'ACTIVE')) {
      throw new ForbiddenException('Vínculo com a empresa não está mais ativo');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokenPair(user, membership, meta);
  }

  async revokeRefreshToken(rawToken: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async issueTokensForMembership(
    userId: string,
    membership: Membership,
    meta: RequestMeta = {},
  ): Promise<TokenPair> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    return this.issueTokenPair(user, membership, meta);
  }

  async selectCompany(
    userId: string,
    companyId: string,
    meta: RequestMeta = {},
  ): Promise<TokenPair> {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_companyId: { userId, companyId } },
    });

    if (!membership || membership.status !== 'ACTIVE') {
      throw new ForbiddenException('Você não tem acesso ativo a esta empresa');
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    return this.issueTokenPair(user, membership, meta);
  }
}
