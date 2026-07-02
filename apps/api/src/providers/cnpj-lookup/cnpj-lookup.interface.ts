export interface CnpjLookupResult {
  cnpj: string;
  valid: boolean;
  // 'structural-only' = só passou pelo checksum, sem confirmação na Receita Federal.
  // 'cnpja' = confirmado via integração real com a CNPJá (ainda não implementada).
  source: 'structural-only' | 'cnpja';
}

export const CNPJ_LOOKUP_SERVICE = Symbol('CNPJ_LOOKUP_SERVICE');

export interface CnpjLookupService {
  lookup(cnpj: string): Promise<CnpjLookupResult>;
}
