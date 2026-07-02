import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { CenteredPage } from '../components/CenteredPage'
import { Field, TextInput } from '../components/Field'
import { useAuth } from './AuthContext'
import { sessionDestination } from './session-destination'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const session = await register(name, email, password)
      await navigate(sessionDestination(session))
    } catch {
      setError('Não foi possível criar a conta. Verifique os dados e tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <CenteredPage>
      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-center text-2xl font-semibold tracking-tight text-slate-900">
          FluxoWork
        </h1>
        <p className="mt-1 text-center text-sm text-slate-600">Crie sua conta.</p>
        <form onSubmit={(event) => void handleSubmit(event)} className="mt-6 space-y-4">
          {error ? <Alert>{error}</Alert> : null}
          <Field label="Nome">
            <TextInput
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
            />
          </Field>
          <Field label="E-mail">
            <TextInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field label="Senha">
            <TextInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </Field>
          <Button type="submit" disabled={submitting} className="w-full">
            Criar conta
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-600">
          Já tem conta?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Entrar
          </Link>
        </p>
      </div>
    </CenteredPage>
  )
}
