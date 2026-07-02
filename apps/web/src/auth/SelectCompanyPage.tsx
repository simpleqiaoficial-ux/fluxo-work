import { useState } from 'react'
import { Navigate } from 'react-router'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { CenteredPage } from '@/components/ui/CenteredPage'
import { useAuth } from './AuthContext'

export function SelectCompanyPage() {
  const { memberships, companyId, selectCompany } = useAuth()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (companyId) {
    return <Navigate to="/" replace />
  }

  const handleSelect = async (id: string) => {
    setPendingId(id)
    setError(null)
    try {
      await selectCompany(id)
    } catch {
      setError('Não foi possível entrar nessa empresa. Tente novamente.')
    } finally {
      setPendingId(null)
    }
  }

  return (
    <CenteredPage>
      <h1 className="text-center text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        Escolha a empresa
      </h1>
      {error ? (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}
      <ul className="mt-6 space-y-2">
        {memberships.map((membership) => (
          <li key={membership.companyId}>
            <button
              type="button"
              disabled={pendingId === membership.companyId}
              onClick={() => void handleSelect(membership.companyId)}
              className="flex w-full items-center justify-between rounded-card border border-slate-200 bg-light-card px-4 py-3 text-left transition-colors duration-180 hover:bg-slate-50 disabled:opacity-50 dark:border-dark-border dark:bg-dark-surface dark:hover:bg-white/5"
            >
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {membership.companyName}
              </span>
              <Badge tone="neutral">{membership.role}</Badge>
            </button>
          </li>
        ))}
      </ul>
    </CenteredPage>
  )
}
