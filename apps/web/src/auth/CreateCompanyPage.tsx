import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { CenteredPage } from '../components/CenteredPage'
import { Field, TextInput } from '../components/Field'
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
    <CenteredPage>
      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Criar empresa</h1>
        <p className="mt-1 text-sm text-slate-600">
          Você ainda não tem vínculo com nenhuma empresa. Crie a sua para continuar.
        </p>
        <form onSubmit={(event) => void handleSubmit(event)} className="mt-6 space-y-4">
          {error ? <Alert>{error}</Alert> : null}
          <Field label="Razão social">
            <TextInput value={legalName} onChange={(e) => setLegalName(e.target.value)} required />
          </Field>
          <Field label="Nome fantasia">
            <TextInput value={tradeName} onChange={(e) => setTradeName(e.target.value)} />
          </Field>
          <Field label="CNPJ">
            <TextInput value={cnpj} onChange={(e) => setCnpj(e.target.value)} required />
          </Field>
          <Button type="submit" disabled={submitting} className="w-full">
            Criar empresa
          </Button>
        </form>
      </div>
    </CenteredPage>
  )
}
