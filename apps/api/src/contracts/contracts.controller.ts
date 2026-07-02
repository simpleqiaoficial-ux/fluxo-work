import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractSignatureDto } from './dto/update-contract-signature.dto';

@Controller('providers/:providerId/contracts')
@UseGuards(JwtAuthGuard, RequireCompanyGuard)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  create(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Req() req: Request,
    @Param('providerId') providerId: string,
    @Body() dto: CreateContractDto,
  ) {
    return this.contractsService.create(
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
    return this.contractsService.findAllForProvider(
      currentUser.companyId as string,
      providerId,
    );
  }

  @Get(':id')
  findOne(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Param('providerId') providerId: string,
    @Param('id') id: string,
  ) {
    return this.contractsService.findById(
      currentUser.companyId as string,
      providerId,
      id,
    );
  }

  @Patch(':id/signature')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  updateSignature(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Req() req: Request,
    @Param('providerId') providerId: string,
    @Param('id') id: string,
    @Body() dto: UpdateContractSignatureDto,
  ) {
    return this.contractsService.updateSignature(
      currentUser.companyId as string,
      providerId,
      id,
      currentUser.sub,
      dto,
      req.ip,
    );
  }
}
