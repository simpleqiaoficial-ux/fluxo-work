import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Navigate } from 'react-router'
import { z } from 'zod'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { CenteredPage } from '@/components/ui/CenteredPage'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { useAuth } from './AuthContext'

const createCompanySchema = z.object({
  legalName: z.string().min(1, 'Informe a razão social'),
  tradeName: z.string().optional(),
  cnpj: z.string().min(1, 'Informe o CNPJ'),
})

type CreateCompanyFormValues = z.infer<typeof createCompanySchema>

export function CreateCompanyPage() {
  const { companyId, createCompany } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateCompanyFormValues>({
    resolver: zodResolver(createCompanySchema),
    mode: 'onBlur',
  })

  if (companyId) {
    return <Navigate to="/" replace />
  }

  const onSubmit = async (values: CreateCompanyFormValues) => {
    setFormError(null)
    try {
      await createCompany({
        legalName: values.legalName,
        tradeName: values.tradeName || undefined,
        cnpj: values.cnpj,
      })
    } catch {
      setFormError('Não foi possível criar a empresa. Confira os dados e tente novamente.')
    }
  }

  return (
    <CenteredPage>
      <div className="rounded-card border border-slate-200 bg-light-card p-6 dark:border-dark-border dark:bg-dark-surface">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Criar empresa
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Você ainda não tem vínculo com nenhuma empresa. Crie a sua para continuar.
        </p>
        <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="mt-6 space-y-4">
          {formError ? <Alert>{formError}</Alert> : null}
          <Field label="Razão social" error={errors.legalName?.message}>
            <Input invalid={Boolean(errors.legalName)} {...register('legalName')} />
          </Field>
          <Field label="Nome fantasia">
            <Input {...register('tradeName')} />
          </Field>
          <Field label="CNPJ" error={errors.cnpj?.message}>
            <Input invalid={Boolean(errors.cnpj)} {...register('cnpj')} />
          </Field>
          <Button type="submit" loading={isSubmitting} className="w-full">
            Criar empresa
          </Button>
        </form>
      </div>
    </CenteredPage>
  )
}
