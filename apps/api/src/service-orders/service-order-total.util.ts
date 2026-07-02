import { Prisma } from '@prisma/client';

export interface ServiceOrderValueComponents {
  baseValue: Prisma.Decimal;
  bonus: Prisma.Decimal;
  commission: Prisma.Decimal;
  additionals: Prisma.Decimal;
  reimbursements: Prisma.Decimal;
  adjustments: Prisma.Decimal;
}

// Nunca existe uma coluna "total" no banco — sempre calculado aqui, em runtime, pra
// não correr risco de o total dessincronizar dos componentes que o compõem (e a
// composição em campos separados é o que sustenta a tese de autonomia na defesa
// jurídica, não pode virar um número único em nenhum momento).
export function calculateServiceOrderTotal(
  components: ServiceOrderValueComponents,
): Prisma.Decimal {
  return components.baseValue
    .plus(components.bonus)
    .plus(components.commission)
    .plus(components.additionals)
    .plus(components.reimbursements)
    .plus(components.adjustments);
}
