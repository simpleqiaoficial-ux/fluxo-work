import {
  Body,
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
import type { Request, Response } from 'express';
import type { User } from '@prisma/client';
import { AuthService, RequestMeta } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AccessTokenPayload } from './interfaces/access-token-payload.interface';
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

  private requestMeta(req: Request): RequestMeta {
    return { ip: req.ip, userAgent: req.get('user-agent') ?? undefined };
  }

  private async issueLoginTokens(user: User, meta: RequestMeta) {
    const memberships = await this.authService.findActiveMemberships(user.id);
    const membership = memberships.length === 1 ? memberships[0] : null;
    const tokens = await this.authService.issueTokenPair(
      user,
      membership,
      meta,
    );

    return {
      tokens,
      body: {
        accessToken: tokens.accessToken,
        needsCompanySelection: memberships.length > 1,
        canCreateCompany: memberships.length === 0,
        memberships: memberships.map((m) => ({
          companyId: m.companyId,
          companyName: m.company.legalName,
          role: m.role,
        })),
      },
    };
  }

  @Post('register')
  async register(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: RegisterDto,
  ) {
    const user = await this.authService.register(
      dto.name,
      dto.email,
      dto.password,
    );
    const { tokens, body } = await this.issueLoginTokens(
      user,
      this.requestMeta(req),
    );
    this.setRefreshCookie(res, tokens);
    return body;
  }

  @Post('login')
  async login(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: LoginDto,
  ) {
    const user = await this.authService.validateCredentials(
      dto.email,
      dto.password,
    );
    const { tokens, body } = await this.issueLoginTokens(
      user,
      this.requestMeta(req),
    );
    this.setRefreshCookie(res, tokens);
    return body;
  }

  @Get('session')
  @UseGuards(JwtAuthGuard)
  async session(@CurrentUser() currentUser: AccessTokenPayload) {
    const memberships = await this.authService.findActiveMemberships(
      currentUser.sub,
    );

    return {
      userId: currentUser.sub,
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
