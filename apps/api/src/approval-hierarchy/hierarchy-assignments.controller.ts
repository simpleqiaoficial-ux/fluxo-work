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
import { CreateHierarchyAssignmentDto } from './dto/create-hierarchy-assignment.dto';
import { UpdateHierarchyAssignmentDto } from './dto/update-hierarchy-assignment.dto';
import { HierarchyAssignmentsService } from './hierarchy-assignments.service';

@Controller('hierarchy-assignments')
@UseGuards(JwtAuthGuard, RequireCompanyGuard)
export class HierarchyAssignmentsController {
  constructor(
    private readonly hierarchyAssignmentsService: HierarchyAssignmentsService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  create(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Req() req: Request,
    @Body() dto: CreateHierarchyAssignmentDto,
  ) {
    return this.hierarchyAssignmentsService.create(
      currentUser.companyId as string,
      currentUser.sub,
      dto,
      req.ip,
    );
  }

  @Get()
  findAll(@CurrentUser() currentUser: AccessTokenPayload) {
    return this.hierarchyAssignmentsService.findAll(
      currentUser.companyId as string,
    );
  }

  @Get(':id')
  findOne(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Param('id') id: string,
  ) {
    return this.hierarchyAssignmentsService.findById(
      currentUser.companyId as string,
      id,
    );
  }

  // Prévia da cadeia de aprovação que um lançamento seguiria se o responsável
  // direto fosse este assignment — útil pro admin conferir a configuração.
  @Get(':id/chain')
  getChain(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Param('id') id: string,
  ) {
    return this.hierarchyAssignmentsService.getApprovalChain(
      currentUser.companyId as string,
      id,
    );
  }

  // Prévia de tudo que essa pessoa enxerga (ela mesma + subárvore).
  @Get(':id/subtree')
  getSubtree(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Param('id') id: string,
  ) {
    return this.hierarchyAssignmentsService.getVisibleAssignmentIds(
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
    @Body() dto: UpdateHierarchyAssignmentDto,
  ) {
    return this.hierarchyAssignmentsService.update(
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
    return this.hierarchyAssignmentsService.remove(
      currentUser.companyId as string,
      id,
      currentUser.sub,
      req.ip,
    );
  }
}
