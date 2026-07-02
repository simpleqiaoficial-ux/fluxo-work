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
import type { Provider } from './types'

const statusLabels: Record<Provider['status'], string> = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
}

const columns: ColumnDef<Provider>[] = [
  { accessorKey: 'legalName', header: 'Razão social' },
  { accessorKey: 'cnpj', header: 'CNPJ' },
  { accessorKey: 'contactName', header: 'Contato' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: (info) => {
      const status = info.getValue<Provider['status']>()
      return <Badge tone={status === 'ACTIVE' ? 'success' : 'neutral'}>{statusLabels[status]}</Badge>
    },
  },
]

export function ProvidersListPage() {
  const { accessToken, role } = useAuth()
  const navigate = useNavigate()
  const [providers, setProviders] = useState<Provider[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [filterCollapsed, setFilterCollapsed] = useState(false)

  useEffect(() => {
    apiFetch<Provider[]>('/providers', { accessToken })
      .then(setProviders)
      .catch(() => setError('Não foi possível carregar os prestadores.'))
  }, [accessToken])

  const filteredProviders = useMemo(() => {
    if (!providers) return []
    const term = search.trim().toLowerCase()
    return providers.filter((provider) => {
      const matchesSearch =
        !term || provider.legalName.toLowerCase().includes(term) || provider.cnpj.toLowerCase().includes(term)
      const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(provider.status)
      return matchesSearch && matchesStatus
    })
  }, [providers, search, selectedStatuses])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ACTIVE: 0, INACTIVE: 0 }
    for (const provider of providers ?? []) {
      counts[provider.status] = (counts[provider.status] ?? 0) + 1
    }
    return counts
  }, [providers])

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Prestadores
        </h1>
        {role === 'ADMIN' ? (
          <Button asChild>
            <Link to="/providers/new">Novo prestador</Link>
          </Button>
        ) : null}
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
          searchPlaceholder="Buscar por nome ou CNPJ"
          groups={[
            {
              id: 'status',
              title: 'Status',
              options: [
                { value: 'ACTIVE', label: 'Ativo', count: statusCounts.ACTIVE },
                { value: 'INACTIVE', label: 'Inativo', count: statusCounts.INACTIVE },
              ],
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
            data={filteredProviders}
            columns={columns}
            isLoading={!providers && !error}
            emptyState="Nenhum prestador cadastrado ainda."
            onRowClick={(provider) => void navigate(`/providers/${provider.id}`)}
            exportFileName="prestadores"
          />
        </div>
      </div>
    </div>
  )
}
