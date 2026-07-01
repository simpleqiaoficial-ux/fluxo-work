import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

function contextWithUser(user: unknown, roles: string[] | undefined) {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(roles),
  } as unknown as Reflector;
  const context = {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;

  return { guard: new RolesGuard(reflector), context };
}

describe('RolesGuard', () => {
  it('allows the request when no roles are required', () => {
    const { guard, context } = contextWithUser(
      { role: 'PRESTADOR' },
      undefined,
    );
    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows the request when the user role is in the required list', () => {
    const { guard, context } = contextWithUser({ role: 'ADMIN' }, [
      'ADMIN',
      'GERENTE',
    ]);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies the request when the user role is not in the required list', () => {
    const { guard, context } = contextWithUser({ role: 'PRESTADOR' }, [
      'ADMIN',
    ]);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('denies the request when there is no user/role on the token at all', () => {
    const { guard, context } = contextWithUser(undefined, ['ADMIN']);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
