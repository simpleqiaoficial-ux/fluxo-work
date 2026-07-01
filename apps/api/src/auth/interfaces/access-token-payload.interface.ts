import type { Role } from '@prisma/client';

export interface AccessTokenPayload {
  sub: string;
  companyId?: string;
  membershipId?: string;
  role?: Role;
}
