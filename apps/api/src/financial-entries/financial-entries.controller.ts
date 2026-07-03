import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { FinancialEntryStatus, Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireCompanyGuard } from '../auth/guards/require-company.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AccessTokenPayload } from '../auth/interfaces/access-token-payload.interface';
import { CreateFinancialEntryDto } from './dto/create-financial-entry.dto';
import { StepDecisionDto } from './dto/step-decision.dto';
import { UpdateFinancialEntryDto } from './dto/update-financial-entry.dto';
import { FinancialEntriesService } from './financial-entries.service';

// A maioria das ações aqui NÃO é restrita por Role fixo de propósito — quem
// pode editar/enviar/cancelar um lançamento é definido por posição na relação
// (quem criou, ou quem ocupa a etapa pendente da cadeia), verificado dentro do
// service, não pelo RolesGuard. Só a etapa Financeiro é um perfil fixo de
// verdade (spec: "único perfil com acesso global"), por isso é a única
// restrita por @Roles aqui.
@Controller('financial-entries')
@UseGuards(JwtAuthGuard, RequireCompanyGuard)
export class FinancialEntriesController {
  constructor(
    private readonly financialEntriesService: FinancialEntriesService,
  ) {}

  @Post()
  create(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Req() req: Request,
    @Body() dto: CreateFinancialEntryDto,
  ) {
    return this.financialEntriesService.create(
      currentUser.companyId as string,
      currentUser.sub,
      dto,
      req.ip,
    );
  }

  @Get()
  findAll(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Query('status') status?: FinancialEntryStatus,
  ) {
    return this.financialEntriesService.findAllForCompany(
      currentUser.companyId as string,
      currentUser.sub,
      currentUser.role,
      status,
    );
  }

  @Get(':id')
  findOne(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Param('id') id: string,
  ) {
    return this.financialEntriesService.findById(
      currentUser.companyId as string,
      id,
      currentUser.sub,
      currentUser.role,
    );
  }

  @Patch(':id')
  update(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateFinancialEntryDto,
  ) {
    return this.financialEntriesService.update(
      currentUser.companyId as string,
      id,
      currentUser.sub,
      currentUser.role === Role.ADMIN,
      dto,
      req.ip,
    );
  }

  @Post(':id/submit')
  submit(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    return this.financialEntriesService.submit(
      currentUser.companyId as string,
      id,
      currentUser.sub,
      currentUser.role === Role.ADMIN,
      req.ip,
    );
  }

  @Post(':id/step-decision')
  decideStep(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: StepDecisionDto,
  ) {
    return this.financialEntriesService.decideStep(
      currentUser.companyId as string,
      id,
      currentUser.sub,
      currentUser.role === Role.ADMIN,
      dto,
      req.ip,
    );
  }

  @Post(':id/finance-decision')
  @UseGuards(RolesGuard)
  @Roles(Role.FINANCEIRO, Role.ADMIN)
  financeDecision(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: StepDecisionDto,
  ) {
    return this.financialEntriesService.financeDecision(
      currentUser.companyId as string,
      id,
      currentUser.sub,
      dto,
      req.ip,
    );
  }

  @Post(':id/mark-paid')
  @UseGuards(RolesGuard)
  @Roles(Role.FINANCEIRO, Role.ADMIN)
  markPaid(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    return this.financialEntriesService.markPaid(
      currentUser.companyId as string,
      id,
      currentUser.sub,
      req.ip,
    );
  }

  @Post(':id/cancel')
  cancel(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    return this.financialEntriesService.cancel(
      currentUser.companyId as string,
      id,
      currentUser.sub,
      currentUser.role === Role.ADMIN,
      req.ip,
    );
  }
}
