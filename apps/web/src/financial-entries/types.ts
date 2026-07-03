export type FinancialEntryStatus =
  | 'DRAFT'
  | 'IN_APPROVAL'
  | 'ADJUSTMENT_REQUESTED'
  | 'IN_FINANCE_REVIEW'
  | 'SCHEDULED'
  | 'PAID'
  | 'REJECTED'
  | 'CANCELLED'

export type FinancialEntryStepStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ADJUSTMENT_REQUESTED'

export type FinancialEntryPriority = 'LOW' | 'MEDIUM' | 'HIGH'

export interface FinancialEntryApprovalStep {
  id: string
  sequence: number
  status: FinancialEntryStepStatus
  decidedByUserId: string | null
  decidedAt: string | null
  note: string | null
  hierarchyAssignment: {
    id: string
    userId: string
    approvalLevel: { id: string; name: string }
    user: { id: string; name: string }
  }
}

export interface FinancialEntry {
  id: string
  companyId: string
  providerId: string
  entryNumber: number
  competencia: string
  type: string
  description: string
  amount: string
  expectedDate: string
  dueDate: string
  paymentMethod: string | null
  priority: FinancialEntryPriority | null
  notes: string | null
  status: FinancialEntryStatus
  createdByUserId: string
  createdAt: string
  updatedAt: string
  steps?: FinancialEntryApprovalStep[]
}
