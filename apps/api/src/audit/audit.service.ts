import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface RecordAuditEventInput {
  action: string;
  entityType: string;
  entityId: string;
  companyId?: string;
  actorUserId?: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  ip?: string;
  context?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  record(input: RecordAuditEventInput) {
    return this.prisma.auditLog.create({
      data: {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        companyId: input.companyId,
        actorUserId: input.actorUserId,
        before: input.before,
        after: input.after,
        ip: input.ip,
        context: input.context,
      },
    });
  }
}
