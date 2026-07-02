import { Module } from '@nestjs/common';
import { ProvidersModule } from '../providers/providers.module';
import { ContractTemplatesController } from './contract-templates.controller';
import { ContractTemplatesService } from './contract-templates.service';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';

@Module({
  imports: [ProvidersModule],
  controllers: [ContractTemplatesController, ContractsController],
  providers: [ContractTemplatesService, ContractsService],
})
export class ContractsModule {}
