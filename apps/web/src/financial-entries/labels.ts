import type { FinancialEntryPriority, FinancialEntryStatus, FinancialEntryStepStatus } from './types'

export const entryStatusLabels: Record<FinancialEntryStatus, string> = {
  DRAFT: 'Rascunho',
  IN_APPROVAL: 'Em aprovação',
  ADJUSTMENT_REQUESTED: 'Ajuste solicitado',
  IN_FINANCE_REVIEW: 'Em análise financeira',
  SCHEDULED: 'Agendado',
  PAID: 'Pago',
  REJECTED: 'Recusado',
  CANCELLED: 'Cancelado',
}

export const entryStatusTones: Record<FinancialEntryStatus, 'neutral' | 'info' | 'warning' | 'primary' | 'success' | 'danger'> = {
  DRAFT: 'neutral',
  IN_APPROVAL: 'info',
  ADJUSTMENT_REQUESTED: 'warning',
  IN_FINANCE_REVIEW: 'info',
  SCHEDULED: 'primary',
  PAID: 'success',
  REJECTED: 'danger',
  CANCELLED: 'neutral',
}

export const stepStatusLabels: Record<FinancialEntryStepStatus, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  REJECTED: 'Recusado',
  ADJUSTMENT_REQUESTED: 'Ajuste solicitado',
}

export const stepStatusTones: Record<FinancialEntryStepStatus, 'neutral' | 'warning' | 'success' | 'danger'> = {
  PENDING: 'neutral',
  APPROVED: 'success',
  REJECTED: 'danger',
  ADJUSTMENT_REQUESTED: 'warning',
}

export const priorityLabels: Record<FinancialEntryPriority, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
}

export function formatCurrency(value: string): string {
  const parsed = Number(value)
  if (Number.isNaN(parsed)) return `R$ ${value}`
  return parsed.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatDate(value: string): string {
  const isoDate = value.includes('T') ? value.slice(0, 10) : value
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('pt-BR')
}
