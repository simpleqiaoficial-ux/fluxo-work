import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useParams } from 'react-router'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Field, Select, TextInput } from '../components/Field'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from '../lib/api'
import type { CommercialAgreement, Provider } from './types'

const agreementTypeLabels: Record<CommercialAgreement['type'], string> = {
  HOURLY: 'Por hora',
  FIXED_PER_ACTIVITY: 'Fixo por atividade',
  MONTHLY: 'Mensal',
}

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
    return <Alert>{error}</Alert>
  }

  if (!provider) {
    return <p className="text-sm text-slate-500">Carregando...</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{provider.legalName}</h1>
        <dl className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-slate-500">CNPJ</dt>
            <dd className="mt-0.5 font-medium text-slate-900">{provider.cnpj}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Contato</dt>
            <dd className="mt-0.5 font-medium text-slate-900">{provider.contactName}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Status</dt>
            <dd className="mt-0.5">
              <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                {provider.status}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900">Acordos comerciais</h2>
        {agreements?.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Nenhum acordo comercial ainda.</p>
        ) : null}
        {agreements && agreements.length > 0 ? (
          <ul className="mt-3 divide-y divide-slate-200 rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
            {agreements.map((agreement) => (
              <li key={agreement.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>
                  <span className="font-medium text-slate-900">
                    {agreementTypeLabels[agreement.type]}
                  </span>
                  <span className="text-slate-500"> — R$ {agreement.baseRate} — </span>
                  <span className="text-slate-700">{agreement.scopeDescription}</span>
                </span>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    agreement.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {agreement.status}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {role === 'ADMIN' ? (
        <Card className="max-w-xl">
          <h2 className="text-base font-semibold text-slate-900">Novo acordo comercial</h2>
          <form onSubmit={(event) => void handleCreateAgreement(event)} className="mt-4 space-y-4">
            <Field label="Tipo">
              <Select value={type} onChange={(e) => setType(e.target.value as CommercialAgreement['type'])}>
                <option value="HOURLY">Por hora</option>
                <option value="FIXED_PER_ACTIVITY">Fixo por atividade</option>
                <option value="MONTHLY">Mensal</option>
              </Select>
            </Field>
            <Field label="Valor acordado">
              <TextInput
                type="number"
                step="0.01"
                value={baseRate}
                onChange={(e) => setBaseRate(e.target.value)}
                required
              />
            </Field>
            <Field label="Escopo">
              <TextInput
                value={scopeDescription}
                onChange={(e) => setScopeDescription(e.target.value)}
                required
              />
            </Field>
            <Field label="Início da vigência">
              <TextInput
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </Field>
            <Button type="submit" disabled={submitting}>
              Criar acordo
            </Button>
          </form>
        </Card>
      ) : null}
    </div>
  )
}
