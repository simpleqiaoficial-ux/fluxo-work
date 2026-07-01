import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireCompanyGuard } from '../auth/guards/require-company.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AccessTokenPayload } from '../auth/interfaces/access-token-payload.interface';
import { setRefreshCookie } from '../auth/refresh-cookie.util';
import { Role } from '@prisma/client';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Controller('companies')
export class CompaniesController {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: CreateCompanyDto,
  ) {
    const { company, membership } = await this.companiesService.createWithAdmin(
      currentUser.sub,
      dto,
      req.ip,
    );

    const tokens = await this.authService.issueTokensForMembership(
      currentUser.sub,
      membership,
      {
        ip: req.ip,
        userAgent: req.get('user-agent') ?? undefined,
      },
    );
    setRefreshCookie(
      res,
      tokens,
      this.config.get<string>('NODE_ENV') === 'production',
    );

    return { accessToken: tokens.accessToken, company };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RequireCompanyGuard)
  findMine(@CurrentUser() currentUser: AccessTokenPayload) {
    return this.companiesService.findById(currentUser.companyId as string);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, RequireCompanyGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Req() req: Request,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companiesService.update(
      currentUser.companyId as string,
      currentUser.sub,
      dto,
      req.ip,
    );
  }
}
