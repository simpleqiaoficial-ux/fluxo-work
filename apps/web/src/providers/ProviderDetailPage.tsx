import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useParams } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from '../lib/api'
import type { CommercialAgreement, Provider } from './types'

export function ProviderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { accessToken, role } = useAuth()

  const [provider, setProvider] = useState<Provider | null>(null)
  const [agreements, setAgreements] = useState<CommercialAgreement[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [type, setType] = useState<CommercialAgreement['type']>('HOURLY')
  const [baseRate, setBaseRate] = useState('')
  const [scopeDescription, setScopeDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadAgreements = () =>
    apiFetch<CommercialAgreement[]>(`/providers/${id}/commercial-agreements`, { accessToken }).then(
      setAgreements,
    )

  useEffect(() => {
    if (!id) return
    apiFetch<Provider>(`/providers/${id}`, { accessToken })
      .then(setProvider)
      .catch(() => setError('Não foi possível carregar o prestador.'))
    loadAgreements().catch(() => setError('Não foi possível carregar os acordos comerciais.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, accessToken])

  const handleCreateAgreement = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await apiFetch(`/providers/${id}/commercial-agreements`, {
        method: 'POST',
        accessToken,
        body: { type, baseRate: Number(baseRate), scopeDescription, startDate },
      })
      setBaseRate('')
      setScopeDescription('')
      setStartDate('')
      await loadAgreements()
    } catch {
      setError('Não foi possível criar o acordo comercial.')
    } finally {
      setSubmitting(false)
    }
  }

  if (error) {
    return (
      <main>
        <p role="alert">{error}</p>
      </main>
    )
  }

  if (!provider) {
    return (
      <main>
        <p>Carregando...</p>
      </main>
    )
  }

  return (
    <main>
      <h1>{provider.legalName}</h1>
      <dl>
        <dt>CNPJ</dt>
        <dd>{provider.cnpj}</dd>
        <dt>Contato</dt>
        <dd>{provider.contactName}</dd>
        <dt>Status</dt>
        <dd>{provider.status}</dd>
      </dl>

      <h2>Acordos comerciais</h2>
      <ul>
        {agreements?.map((agreement) => (
          <li key={agreement.id}>
            {agreement.type} — R$ {agreement.baseRate} — {agreement.scopeDescription} (
            {agreement.status})
          </li>
        ))}
      </ul>

      {role === 'ADMIN' ? (
        <form onSubmit={(event) => void handleCreateAgreement(event)}>
          <h3>Novo acordo comercial</h3>
          <label>
            Tipo
            <select value={type} onChange={(e) => setType(e.target.value as CommercialAgreement['type'])}>
              <option value="HOURLY">Por hora</option>
              <option value="FIXED_PER_ACTIVITY">Fixo por atividade</option>
              <option value="MONTHLY">Mensal</option>
            </select>
          </label>
          <label>
            Valor acordado
            <input
              type="number"
              step="0.01"
              value={baseRate}
              onChange={(e) => setBaseRate(e.target.value)}
              required
            />
          </label>
          <label>
            Escopo
            <input
              value={scopeDescription}
              onChange={(e) => setScopeDescription(e.target.value)}
              required
            />
          </label>
          <label>
            Início da vigência
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </label>
          <button type="submit" disabled={submitting}>
            Criar acordo
          </button>
        </form>
      ) : null}
    </main>
  )
}
