import { Injectable, Logger } from '@nestjs/common';
import { isValidCnpj } from '../../common/cnpj.util';
import { CnpjLookupResult, CnpjLookupService } from './cnpj-lookup.interface';

// Sem credencial de sandbox da CNPJá disponível ainda (spec seção 7) — esta
// implementação só confirma o checksum do CNPJ, sem consultar a Receita Federal.
// Trocar por uma implementação real via token CNPJ_LOOKUP_SERVICE quando a
// integração estiver disponível, sem alterar quem consome este serviço.
@Injectable()
export class StructuralCnpjLookupService implements CnpjLookupService {
  private readonly logger = new Logger(StructuralCnpjLookupService.name);

  lookup(cnpj: string): Promise<CnpjLookupResult> {
    this.logger.warn(
      `Validação de CNPJ estrutural apenas (sem CNPJá): ${cnpj}`,
    );
    return Promise.resolve({
      cnpj,
      valid: isValidCnpj(cnpj),
      source: 'structural-only',
    });
  }
}
