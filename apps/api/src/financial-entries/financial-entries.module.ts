import { Module } from '@nestjs/common';
import { ApprovalHierarchyModule } from '../approval-hierarchy/approval-hierarchy.module';
import { ProvidersModule } from '../providers/providers.module';
import { FinancialEntriesController } from './financial-entries.controller';
import { FinancialEntriesService } from './financial-entries.service';

@Module({
  imports: [ProvidersModule, ApprovalHierarchyModule],
  controllers: [FinancialEntriesController],
  providers: [FinancialEntriesService],
})
export class FinancialEntriesModule {}
