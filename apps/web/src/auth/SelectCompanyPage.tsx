import { useState } from 'react'
import { Navigate } from 'react-router'
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
    <main>
      <h1>Escolha a empresa</h1>
      {error ? <p role="alert">{error}</p> : null}
      <ul>
        {memberships.map((membership) => (
          <li key={membership.companyId}>
            <button
              type="button"
              disabled={pendingId === membership.companyId}
              onClick={() => void handleSelect(membership.companyId)}
            >
              {membership.companyName} — {membership.role}
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}
