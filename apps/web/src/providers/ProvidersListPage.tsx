import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from '../lib/api'
import type { Provider } from './types'

export function ProvidersListPage() {
  const { accessToken, role } = useAuth()
  const [providers, setProviders] = useState<Provider[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch<Provider[]>('/providers', { accessToken })
      .then(setProviders)
      .catch(() => setError('Não foi possível carregar os prestadores.'))
  }, [accessToken])

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Prestadores</h1>
        {role === 'ADMIN' ? (
          <Link to="/providers/new">
            <Button type="button">Novo prestador</Button>
          </Link>
        ) : null}
      </div>

      {error ? (
        <div className="mt-6">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      {!providers && !error ? <p className="mt-6 text-sm text-slate-500">Carregando...</p> : null}

      {providers?.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">Nenhum prestador cadastrado ainda.</p>
      ) : null}

      {providers && providers.length > 0 ? (
        <ul className="mt-6 divide-y divide-slate-200 rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
          {providers.map((provider) => (
            <li key={provider.id}>
              <Link
                to={`/providers/${provider.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
              >
                <span className="font-medium text-slate-900">{provider.legalName}</span>
                <span className="text-sm text-slate-500">{provider.cnpj}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
