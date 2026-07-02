import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { z } from 'zod'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from '../lib/api'
import type { Provider } from './types'

const providerSchema = z.object({
  cnpj: z.string().min(1, 'Informe o CNPJ'),
  legalName: z.string().min(1, 'Informe a razão social'),
  tradeName: z.string().optional(),
  contactName: z.string().min(1, 'Informe o nome do contato'),
  cpf: z.string().min(1, 'Informe o CPF do contato'),
})

type ProviderFormValues = z.infer<typeof providerSchema>

export function ProviderCreatePage() {
  const { accessToken } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProviderFormValues>({
    resolver: zodResolver(providerSchema),
    mode: 'onBlur',
  })

  const onSubmit = async (values: ProviderFormValues) => {
    setFormError(null)
    try {
      const provider = await apiFetch<Provider>('/providers', {
        method: 'POST',
        accessToken,
        body: {
          cnpj: values.cnpj,
          legalName: values.legalName,
          tradeName: values.tradeName || undefined,
          contactName: values.contactName,
          cpf: values.cpf,
        },
      })
      await navigate(`/providers/${provider.id}`)
    } catch {
      setFormError('Não foi possível cadastrar o prestador. Confira os dados e tente novamente.')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        Novo prestador
      </h1>
      <Card className="mt-6 max-w-xl">
        <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="space-y-4">
          {formError ? <Alert>{formError}</Alert> : null}
          <Field label="CNPJ" error={errors.cnpj?.message}>
            <Input invalid={Boolean(errors.cnpj)} {...register('cnpj')} />
          </Field>
          <Field label="Razão social" error={errors.legalName?.message}>
            <Input invalid={Boolean(errors.legalName)} {...register('legalName')} />
          </Field>
          <Field label="Nome fantasia">
            <Input {...register('tradeName')} />
          </Field>
          <Field label="Nome do contato" error={errors.contactName?.message}>
            <Input invalid={Boolean(errors.contactName)} {...register('contactName')} />
          </Field>
          <Field label="CPF do contato" error={errors.cpf?.message}>
            <Input invalid={Boolean(errors.cpf)} {...register('cpf')} />
          </Field>
          <Button type="submit" loading={isSubmitting}>
            Cadastrar
          </Button>
        </form>
      </Card>
    </div>
  )
}
