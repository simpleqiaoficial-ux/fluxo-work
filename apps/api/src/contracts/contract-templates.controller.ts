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
import { ContractTemplatesService } from './contract-templates.service';
import { CreateContractTemplateDto } from './dto/create-contract-template.dto';
import { UpdateContractTemplateDto } from './dto/update-contract-template.dto';

@Controller('contract-templates')
@UseGuards(JwtAuthGuard, RequireCompanyGuard)
export class ContractTemplatesController {
  constructor(
    private readonly contractTemplatesService: ContractTemplatesService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  create(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Req() req: Request,
    @Body() dto: CreateContractTemplateDto,
  ) {
    return this.contractTemplatesService.create(
      currentUser.companyId as string,
      currentUser.sub,
      dto,
      req.ip,
    );
  }

  @Get()
  findAll(@CurrentUser() currentUser: AccessTokenPayload) {
    return this.contractTemplatesService.findAll(
      currentUser.companyId as string,
    );
  }

  @Get(':id')
  findOne(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Param('id') id: string,
  ) {
    return this.contractTemplatesService.findById(
      currentUser.companyId as string,
      id,
    );
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  update(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateContractTemplateDto,
  ) {
    return this.contractTemplatesService.update(
      currentUser.companyId as string,
      id,
      currentUser.sub,
      dto,
      req.ip,
    );
  }
}
