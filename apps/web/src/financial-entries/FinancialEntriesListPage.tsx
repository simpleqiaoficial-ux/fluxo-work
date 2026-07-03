import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FilterPanel } from '@/components/ui/FilterPanel'
import { Table } from '@/components/ui/Table'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from '../lib/api'
import { entryStatusLabels, entryStatusTones, formatCurrency, formatDate } from './labels'
import type { FinancialEntry, FinancialEntryStatus } from './types'

const ALL_STATUSES: FinancialEntryStatus[] = [
  'DRAFT',
  'IN_APPROVAL',
  'ADJUSTMENT_REQUESTED',
  'IN_FINANCE_REVIEW',
  'SCHEDULED',
  'PAID',
  'REJECTED',
  'CANCELLED',
]

const columns: ColumnDef<FinancialEntry>[] = [
  { accessorKey: 'entryNumber', header: 'Nº' },
  { accessorKey: 'type', header: 'Tipo' },
  { accessorKey: 'description', header: 'Descrição' },
  {
    accessorKey: 'amount',
    header: 'Valor',
    cell: (info) => formatCurrency(info.getValue<string>()),
  },
  {
    accessorKey: 'dueDate',
    header: 'Vencimento',
    cell: (info) => formatDate(info.getValue<string>()),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: (info) => {
      const status = info.getValue<FinancialEntryStatus>()
      return <Badge tone={entryStatusTones[status]}>{entryStatusLabels[status]}</Badge>
    },
  },
]

export function FinancialEntriesListPage() {
  const { accessToken } = useAuth()
  const navigate = useNavigate()
  const [entries, setEntries] = useState<FinancialEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [filterCollapsed, setFilterCollapsed] = useState(false)

  useEffect(() => {
    apiFetch<FinancialEntry[]>('/financial-entries', { accessToken })
      .then(setEntries)
      .catch(() => setError('Não foi possível carregar os lançamentos financeiros.'))
  }, [accessToken])

  const filteredEntries = useMemo(() => {
    if (!entries) return []
    const term = search.trim().toLowerCase()
    return entries.filter((entry) => {
      const matchesSearch =
        !term || entry.type.toLowerCase().includes(term) || entry.description.toLowerCase().includes(term)
      const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(entry.status)
      return matchesSearch && matchesStatus
    })
  }, [entries, search, selectedStatuses])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const status of ALL_STATUSES) counts[status] = 0
    for (const entry of entries ?? []) {
      counts[entry.status] = (counts[entry.status] ?? 0) + 1
    }
    return counts
  }, [entries])

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Lançamentos financeiros
        </h1>
        <Button asChild>
          <Link to="/financial-entries/new">Novo lançamento</Link>
        </Button>
      </div>

      {error ? (
        <div className="mt-6">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      <div className="mt-6 flex items-start gap-4">
        <FilterPanel
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por tipo ou descrição"
          groups={[
            {
              id: 'status',
              title: 'Status',
              options: ALL_STATUSES.map((status) => ({
                value: status,
                label: entryStatusLabels[status],
                count: statusCounts[status],
              })),
            },
          ]}
          selectedValues={{ status: selectedStatuses }}
          onToggleValue={(_groupId, value) =>
            setSelectedStatuses((current) =>
              current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
            )
          }
          onClear={() => setSelectedStatuses([])}
          collapsed={filterCollapsed}
          onToggleCollapsed={() => setFilterCollapsed((current) => !current)}
        />
        <div className="min-w-0 flex-1">
          <Table
            data={filteredEntries}
            columns={columns}
            isLoading={!entries && !error}
            emptyState="Nenhum lançamento financeiro ainda."
            onRowClick={(entry) => void navigate(`/financial-entries/${entry.id}`)}
            exportFileName="lancamentos-financeiros"
          />
        </div>
      </div>
    </div>
  )
}
