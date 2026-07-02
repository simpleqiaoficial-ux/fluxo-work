import {
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AccessTokenPayload } from './interfaces/access-token-payload.interface';
import type { GoogleProfile } from './interfaces/google-profile.interface';
import { REFRESH_COOKIE_NAME, setRefreshCookie } from './refresh-cookie.util';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  private setRefreshCookie(
    res: Response,
    tokens: Parameters<typeof setRefreshCookie>[1],
  ) {
    setRefreshCookie(
      res,
      tokens,
      this.config.get<string>('NODE_ENV') === 'production',
    );
  }

  private requestMeta(req: Request) {
    return { ip: req.ip, userAgent: req.get('user-agent') ?? undefined };
  }

  private webOrigin() {
    return this.config.get<string>('WEB_ORIGIN') ?? 'http://localhost:5173';
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {
    // Passport intercepta e redireciona para o consentimento do Google.
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const profile = req.user as GoogleProfile;
    const { user } = await this.authService.findOrCreateUser(profile);
    const memberships = await this.authService.findActiveMemberships(user.id);

    const membership = memberships.length === 1 ? memberships[0] : null;
    const tokens = await this.authService.issueTokenPair(
      user,
      membership,
      this.requestMeta(req),
    );
    this.setRefreshCookie(res, tokens);

    // Chega aqui por navegação de página inteira (redirect do Google), não por
    // fetch — devolver JSON mostraria texto cru na tela. O access token vai só
    // no fragmento da URL (nunca chega ao servidor/logs); o front-end lê e
    // decide pra onde ir chamando GET /auth/session.
    res.redirect(
      `${this.webOrigin()}/auth/callback#accessToken=${tokens.accessToken}`,
    );
  }

  @Get('session')
  @UseGuards(JwtAuthGuard)
  async session(@CurrentUser() currentUser: AccessTokenPayload) {
    const memberships = await this.authService.findActiveMemberships(
      currentUser.sub,
    );

    return {
      companyId: currentUser.companyId,
      role: currentUser.role,
      memberships: memberships.map((m) => ({
        companyId: m.companyId,
        companyName: m.company.legalName,
        role: m.role,
      })),
    };
  }

  @Post('select-company/:companyId')
  @UseGuards(JwtAuthGuard)
  async selectCompany(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Param('companyId') companyId: string,
  ) {
    const userId = (req.user as { sub: string }).sub;
    const tokens = await this.authService.selectCompany(
      userId,
      companyId,
      this.requestMeta(req),
    );
    this.setRefreshCookie(res, tokens);
    return { accessToken: tokens.accessToken };
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    if (!rawToken) {
      throw new UnauthorizedException('Refresh token ausente');
    }

    const tokens = await this.authService.rotateRefreshToken(
      rawToken,
      this.requestMeta(req),
    );
    this.setRefreshCookie(res, tokens);
    return { accessToken: tokens.accessToken };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    if (rawToken) {
      await this.authService.revokeRefreshToken(rawToken);
    }
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/auth' });
    return { success: true };
  }
}
