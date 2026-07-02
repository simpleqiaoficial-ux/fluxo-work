// Ação de decisão pedida via API — não é um enum do banco (o status persistido é
// ServiceOrderStatus). Existe só pra dar nome às três ações possíveis em cada etapa
// de aprovação (Gerente e Financeiro), usadas pelo service pra decidir a transição.
export enum ServiceOrderDecision {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  REQUEST_ADJUSTMENT = 'REQUEST_ADJUSTMENT',
}
