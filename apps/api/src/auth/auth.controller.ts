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
import { JwtAuthGuard } from './guards/jwt-auth.guard';
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

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {
    // Passport intercepta e redireciona para o consentimento do Google.
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
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

    return {
      accessToken: tokens.accessToken,
      needsCompanySelection: memberships.length > 1,
      canCreateCompany: memberships.length === 0,
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
