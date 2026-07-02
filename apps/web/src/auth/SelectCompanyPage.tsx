import { useState } from 'react'
import { Navigate } from 'react-router'
import { Alert } from '../components/Alert'
import { CenteredPage } from '../components/CenteredPage'
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
      <h1 className="text-center text-2xl font-semibold tracking-tight text-slate-900">
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
              className="flex w-full items-center justify-between rounded-lg bg-white px-4 py-3 text-left shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              <span className="font-medium text-slate-900">{membership.companyName}</span>
              <span className="text-sm text-slate-500">{membership.role}</span>
            </button>
          </li>
        ))}
      </ul>
    </CenteredPage>
  )
}
