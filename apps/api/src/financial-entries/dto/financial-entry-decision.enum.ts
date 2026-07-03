// Mesmo padrão do módulo de Ordens de Serviço — ação pedida via API, não é o
// status persistido (esse é FinancialEntryStatus/FinancialEntryStepStatus).
export enum FinancialEntryDecision {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  REQUEST_ADJUSTMENT = 'REQUEST_ADJUSTMENT',
}
