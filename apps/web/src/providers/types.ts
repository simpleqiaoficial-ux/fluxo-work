export interface Provider {
  id: string
  companyId: string
  cnpj: string
  legalName: string
  tradeName: string | null
  contactName: string
  cpf: string
  rg: string | null
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: string
  updatedAt: string
}

export interface CommercialAgreement {
  id: string
  companyId: string
  providerId: string
  type: 'HOURLY' | 'FIXED_PER_ACTIVITY' | 'MONTHLY'
  baseRate: string
  scopeDescription: string
  status: 'ACTIVE' | 'SUSPENDED' | 'TERMINATED'
  startDate: string
  endDate: string | null
  createdAt: string
  updatedAt: string
}
