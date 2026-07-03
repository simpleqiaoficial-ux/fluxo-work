import { Module } from '@nestjs/common';
import { ApprovalLevelsController } from './approval-levels.controller';
import { ApprovalLevelsService } from './approval-levels.service';
import { HierarchyAssignmentsController } from './hierarchy-assignments.controller';
import { HierarchyAssignmentsService } from './hierarchy-assignments.service';

@Module({
  controllers: [ApprovalLevelsController, HierarchyAssignmentsController],
  providers: [ApprovalLevelsService, HierarchyAssignmentsService],
  exports: [HierarchyAssignmentsService],
})
export class ApprovalHierarchyModule {}
