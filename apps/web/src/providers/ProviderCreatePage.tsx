import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router'
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
    <main>
      <h1>Novo prestador</h1>
      <form onSubmit={(event) => void handleSubmit(event)}>
        {error ? <p role="alert">{error}</p> : null}
        <label>
          CNPJ
          <input value={cnpj} onChange={(e) => setCnpj(e.target.value)} required />
        </label>
        <label>
          Razão social
          <input value={legalName} onChange={(e) => setLegalName(e.target.value)} required />
        </label>
        <label>
          Nome fantasia
          <input value={tradeName} onChange={(e) => setTradeName(e.target.value)} />
        </label>
        <label>
          Nome do contato
          <input value={contactName} onChange={(e) => setContactName(e.target.value)} required />
        </label>
        <label>
          CPF do contato
          <input value={cpf} onChange={(e) => setCpf(e.target.value)} required />
        </label>
        <button type="submit" disabled={submitting}>
          Cadastrar
        </button>
      </form>
    </main>
  )
}
