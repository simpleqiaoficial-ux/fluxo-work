import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Field, TextInput } from '../components/Field'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from '../lib/api'
import type { Provider } from './types'

export function ProviderCreatePage() {
  const { accessToken } = useAuth()
  const navigate = useNavigate()

  const [cnpj, setCnpj] = useState('')
  const [legalName, setLegalName] = useState('')
  const [tradeName, setTradeName] = useState('')
  const [contactName, setContactName] = useState('')
  const [cpf, setCpf] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const provider = await apiFetch<Provider>('/providers', {
        method: 'POST',
        accessToken,
        body: { cnpj, legalName, tradeName: tradeName || undefined, contactName, cpf },
      })
      await navigate(`/providers/${provider.id}`)
    } catch {
      setError('Não foi possível cadastrar o prestador. Confira os dados e tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Novo prestador</h1>
      <Card className="mt-6 max-w-xl">
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          {error ? <Alert>{error}</Alert> : null}
          <Field label="CNPJ">
            <TextInput value={cnpj} onChange={(e) => setCnpj(e.target.value)} required />
          </Field>
          <Field label="Razão social">
            <TextInput value={legalName} onChange={(e) => setLegalName(e.target.value)} required />
          </Field>
          <Field label="Nome fantasia">
            <TextInput value={tradeName} onChange={(e) => setTradeName(e.target.value)} />
          </Field>
          <Field label="Nome do contato">
            <TextInput value={contactName} onChange={(e) => setContactName(e.target.value)} required />
          </Field>
          <Field label="CPF do contato">
            <TextInput value={cpf} onChange={(e) => setCpf(e.target.value)} required />
          </Field>
          <Button type="submit" disabled={submitting}>
            Cadastrar
          </Button>
        </form>
      </Card>
    </div>
  )
}
