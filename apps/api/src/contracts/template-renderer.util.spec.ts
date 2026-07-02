import { renderTemplate } from './template-renderer.util';

describe('renderTemplate', () => {
  it('substitutes known placeholders with values from the context', () => {
    const result = renderTemplate(
      'Prestador: {{provider.legalName}}, empresa {{company.legalName}}.',
      {
        provider: { legalName: 'Fulano LTDA' },
        company: { legalName: 'Acme SA' },
      },
    );

    expect(result).toBe('Prestador: Fulano LTDA, empresa Acme SA.');
  });

  it('leaves unknown placeholders untouched instead of throwing', () => {
    const result = renderTemplate('Valor: {{agreement.baseRate}}.', {
      provider: {},
    });
    expect(result).toBe('Valor: {{agreement.baseRate}}.');
  });

  it('leaves placeholders untouched when the referenced value is null', () => {
    const result = renderTemplate('Acordo: {{agreement.baseRate}}.', {
      agreement: null,
    });
    expect(result).toBe('Acordo: {{agreement.baseRate}}.');
  });
});
