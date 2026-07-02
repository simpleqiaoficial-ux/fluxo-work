import type { Response } from 'express';
import { TokenPair } from './auth.service';

export const REFRESH_COOKIE_NAME = 'fw_refresh_token';

export function setRefreshCookie(
  res: Response,
  tokens: TokenPair,
  isProduction: boolean,
) {
  // web e api são serviços Cloud Run em domínios *.run.app diferentes — cada um é
  // um "site" distinto pra regra de SameSite. 'Lax' não é enviado em fetch/XHR
  // entre sites diferentes (só em navegação de página inteira), então o refresh
  // via fetch do front-end não funcionaria em produção sem 'None' + Secure.
  // Em dev local (sem HTTPS), Secure bloquearia o cookie inteiro — por isso
  // continua 'Lax' sem Secure localmente, onde web/api rodam em localhost.
  res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/auth',
    expires: tokens.refreshTokenExpiresAt,
  });
}
