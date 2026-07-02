import { Module } from '@nestjs/common';
import { CommercialAgreementsController } from './commercial-agreements.controller';
import { CommercialAgreementsService } from './commercial-agreements.service';
import { CNPJ_LOOKUP_SERVICE } from './cnpj-lookup/cnpj-lookup.interface';
import { StructuralCnpjLookupService } from './cnpj-lookup/structural-cnpj-lookup.service';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';

@Module({
  controllers: [ProvidersController, CommercialAgreementsController],
  providers: [
    ProvidersService,
    CommercialAgreementsService,
    { provide: CNPJ_LOOKUP_SERVICE, useClass: StructuralCnpjLookupService },
  ],
  exports: [ProvidersService],
})
export class ProvidersModule {}
