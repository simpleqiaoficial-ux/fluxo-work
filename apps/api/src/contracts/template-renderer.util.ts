import { Prisma } from '@prisma/client';

// Substituição simples de placeholders `{{caminho.para.campo}}` por valores de um
// contexto (ex.: { provider: { legalName: '...' } } resolve `{{provider.legalName}}`).
// Sem biblioteca de template — a necessidade aqui é troca de string, não lógica.
// Placeholders que não resolvem (ou resolvem para algo não-stringificável, como um
// objeto/array) ficam intactos — melhor deixar visível no texto do que gravar
// "[object Object]" num contrato.
export function renderTemplate(
  template: string,
  context: Record<string, unknown>,
): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, path: string) => {
    const value = path.split('.').reduce<unknown>((acc, key) => {
      if (acc !== null && typeof acc === 'object' && key in acc) {
        return (acc as Record<string, unknown>)[key];
      }
      return undefined;
    }, context);

    return stringifyPlaceholderValue(value) ?? match;
  });
}

function stringifyPlaceholderValue(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value);
  }
  if (value instanceof Prisma.Decimal || value instanceof Date) {
    return value.toString();
  }
  return null;
}
