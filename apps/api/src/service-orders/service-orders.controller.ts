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
import { Role, ServiceOrderStatus } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireCompanyGuard } from '../auth/guards/require-company.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AccessTokenPayload } from '../auth/interfaces/access-token-payload.interface';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { FinanceDecisionDto } from './dto/finance-decision.dto';
import { ManagerDecisionDto } from './dto/manager-decision.dto';
import { UpdateServiceOrderDto } from './dto/update-service-order.dto';
import { ServiceOrdersService } from './service-orders.service';

@Controller('service-orders')
@UseGuards(JwtAuthGuard, RequireCompanyGuard)
export class ServiceOrdersController {
  constructor(private readonly serviceOrdersService: ServiceOrdersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERVISOR, Role.ADMIN)
  create(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Req() req: Request,
    @Body() dto: CreateServiceOrderDto,
  ) {
    return this.serviceOrdersService.create(
      currentUser.companyId as string,
      currentUser.sub,
      dto,
      req.ip,
    );
  }

  @Get()
  findAll(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Query('status') status?: ServiceOrderStatus,
  ) {
    return this.serviceOrdersService.findAllForCompany(
      currentUser.companyId as string,
      status,
    );
  }

  @Get(':id')
  findOne(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Param('id') id: string,
  ) {
    return this.serviceOrdersService.findById(
      currentUser.companyId as string,
      id,
    );
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERVISOR, Role.ADMIN)
  update(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateServiceOrderDto,
  ) {
    return this.serviceOrdersService.update(
      currentUser.companyId as string,
      id,
      currentUser.sub,
      dto,
      req.ip,
    );
  }

  @Patch(':id/manager-decision')
  @UseGuards(RolesGuard)
  @Roles(Role.GERENTE, Role.ADMIN)
  managerDecision(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: ManagerDecisionDto,
  ) {
    return this.serviceOrdersService.managerDecision(
      currentUser.companyId as string,
      id,
      currentUser.sub,
      dto,
      req.ip,
    );
  }

  @Patch(':id/finance-decision')
  @UseGuards(RolesGuard)
  @Roles(Role.FINANCEIRO, Role.ADMIN)
  financeDecision(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: FinanceDecisionDto,
  ) {
    return this.serviceOrdersService.financeDecision(
      currentUser.companyId as string,
      id,
      currentUser.sub,
      dto,
      req.ip,
    );
  }

  @Patch(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERVISOR, Role.ADMIN)
  cancel(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    return this.serviceOrdersService.cancel(
      currentUser.companyId as string,
      id,
      currentUser.sub,
      req.ip,
    );
  }
}
