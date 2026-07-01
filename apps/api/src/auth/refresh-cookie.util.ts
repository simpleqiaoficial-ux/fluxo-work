import type { Response } from 'express';
import { TokenPair } from './auth.service';

export const REFRESH_COOKIE_NAME = 'fw_refresh_token';

export function setRefreshCookie(
  res: Response,
  tokens: TokenPair,
  isProduction: boolean,
) {
  res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/auth',
    expires: tokens.refreshTokenExpiresAt,
  });
}
