import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AccessTokenPayload } from '../interfaces/access-token-payload.interface';

@Injectable()
export class RequireCompanyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AccessTokenPayload }>();
    const user = request.user;

    if (!user?.companyId) {
      throw new ForbiddenException('Selecione uma empresa antes de continuar');
    }

    return true;
  }
}
