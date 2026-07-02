import { StructuralCnpjLookupService } from './structural-cnpj-lookup.service';

describe('StructuralCnpjLookupService', () => {
  const service = new StructuralCnpjLookupService();

  it('reports a valid CNPJ as valid, sourced as structural-only', async () => {
    const result = await service.lookup('11444777000161');
    expect(result).toEqual({
      cnpj: '11444777000161',
      valid: true,
      source: 'structural-only',
    });
  });

  it('reports an invalid CNPJ as invalid', async () => {
    const result = await service.lookup('11111111111111');
    expect(result.valid).toBe(false);
    expect(result.source).toBe('structural-only');
  });
});
