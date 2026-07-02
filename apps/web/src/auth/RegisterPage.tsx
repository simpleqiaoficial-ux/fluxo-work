import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { z } from 'zod'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { CenteredPage } from '@/components/ui/CenteredPage'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { useAuth } from './AuthContext'
import { sessionDestination } from './session-destination'

const registerSchema = z.object({
  name: z.string().min(2, 'Informe seu nome completo'),
  email: z.string().email('Informe um e-mail válido'),
  password: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres'),
})

type RegisterFormValues = z.infer<typeof registerSchema>

export function RegisterPage() {
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
  })

  const onSubmit = async (values: RegisterFormValues) => {
    setFormError(null)
    try {
      const session = await registerUser(values.name, values.email, values.password)
      await navigate(sessionDestination(session))
    } catch {
      setFormError('Não foi possível criar a conta. Verifique os dados e tente novamente.')
    }
  }

  return (
    <CenteredPage>
      <div className="rounded-card border border-slate-200 bg-light-card p-6 dark:border-dark-border dark:bg-dark-surface">
        <h1 className="text-center text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          FluxoWork
        </h1>
        <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">Crie sua conta.</p>
        <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="mt-6 space-y-4">
          {formError ? <Alert>{formError}</Alert> : null}
          <Field label="Nome" error={errors.name?.message}>
            <Input type="text" invalid={Boolean(errors.name)} {...register('name')} />
          </Field>
          <Field label="E-mail" error={errors.email?.message}>
            <Input type="email" invalid={Boolean(errors.email)} {...register('email')} />
          </Field>
          <Field label="Senha" error={errors.password?.message} hint="Mínimo de 8 caracteres">
            <Input type="password" invalid={Boolean(errors.password)} {...register('password')} />
          </Field>
          <Button type="submit" loading={isSubmitting} className="w-full">
            Criar conta
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
          Já tem conta?{' '}
          <Link to="/login" className="font-medium text-primary hover:text-primary-hover">
            Entrar
          </Link>
        </p>
      </div>
    </CenteredPage>
  )
}
