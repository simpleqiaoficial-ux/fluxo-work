import {
  Body,
  Controller,
  Delete,
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
import { ApprovalLevelsService } from './approval-levels.service';
import { CreateApprovalLevelDto } from './dto/create-approval-level.dto';
import { UpdateApprovalLevelDto } from './dto/update-approval-level.dto';

@Controller('approval-levels')
@UseGuards(JwtAuthGuard, RequireCompanyGuard)
export class ApprovalLevelsController {
  constructor(private readonly approvalLevelsService: ApprovalLevelsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  create(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Req() req: Request,
    @Body() dto: CreateApprovalLevelDto,
  ) {
    return this.approvalLevelsService.create(
      currentUser.companyId as string,
      currentUser.sub,
      dto,
      req.ip,
    );
  }

  @Get()
  findAll(@CurrentUser() currentUser: AccessTokenPayload) {
    return this.approvalLevelsService.findAll(currentUser.companyId as string);
  }

  @Get(':id')
  findOne(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Param('id') id: string,
  ) {
    return this.approvalLevelsService.findById(
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
    @Body() dto: UpdateApprovalLevelDto,
  ) {
    return this.approvalLevelsService.update(
      currentUser.companyId as string,
      id,
      currentUser.sub,
      dto,
      req.ip,
    );
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  remove(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    return this.approvalLevelsService.remove(
      currentUser.companyId as string,
      id,
      currentUser.sub,
      req.ip,
    );
  }
}
