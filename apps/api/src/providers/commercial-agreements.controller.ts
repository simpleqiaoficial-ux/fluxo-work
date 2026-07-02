import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireCompanyGuard } from '../auth/guards/require-company.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AccessTokenPayload } from '../auth/interfaces/access-token-payload.interface';
import { CommercialAgreementsService } from './commercial-agreements.service';
import { CreateCommercialAgreementDto } from './dto/create-commercial-agreement.dto';

@Controller('providers/:providerId/commercial-agreements')
@UseGuards(JwtAuthGuard, RequireCompanyGuard)
export class CommercialAgreementsController {
  constructor(
    private readonly commercialAgreementsService: CommercialAgreementsService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  create(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Req() req: Request,
    @Param('providerId') providerId: string,
    @Body() dto: CreateCommercialAgreementDto,
  ) {
    return this.commercialAgreementsService.create(
      currentUser.companyId as string,
      providerId,
      currentUser.sub,
      dto,
      req.ip,
    );
  }

  @Get()
  findAll(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Param('providerId') providerId: string,
  ) {
    return this.commercialAgreementsService.findAllForProvider(
      currentUser.companyId as string,
      providerId,
    );
  }
}
