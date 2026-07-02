import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from './AuthContext'

export function CreateCompanyPage() {
  const { companyId, createCompany } = useAuth()
  const [legalName, setLegalName] = useState('')
  const [tradeName, setTradeName] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (companyId) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await createCompany({ legalName, tradeName: tradeName || undefined, cnpj })
    } catch {
      setError('Não foi possível criar a empresa. Confira os dados e tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main>
      <h1>Criar empresa</h1>
      <p>Você ainda não tem vínculo com nenhuma empresa. Crie a sua para continuar.</p>
      <form onSubmit={(event) => void handleSubmit(event)}>
        {error ? <p role="alert">{error}</p> : null}
        <label>
          Razão social
          <input value={legalName} onChange={(e) => setLegalName(e.target.value)} required />
        </label>
        <label>
          Nome fantasia
          <input value={tradeName} onChange={(e) => setTradeName(e.target.value)} />
        </label>
        <label>
          CNPJ
          <input value={cnpj} onChange={(e) => setCnpj(e.target.value)} required />
        </label>
        <button type="submit" disabled={submitting}>
          Criar empresa
        </button>
      </form>
    </main>
  )
}
