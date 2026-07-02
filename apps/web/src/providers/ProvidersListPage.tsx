import { useEffect, useState } from 'react'
import { Link } from 'react-router'
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
    <main>
      <h1>Prestadores</h1>
      {role === 'ADMIN' ? <Link to="/providers/new">Novo prestador</Link> : null}
      {error ? <p role="alert">{error}</p> : null}
      {!providers && !error ? <p>Carregando...</p> : null}
      {providers?.length === 0 ? <p>Nenhum prestador cadastrado ainda.</p> : null}
      <ul>
        {providers?.map((provider) => (
          <li key={provider.id}>
            <Link to={`/providers/${provider.id}`}>
              {provider.legalName} — {provider.cnpj}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
