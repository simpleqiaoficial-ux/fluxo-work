import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { z } from 'zod'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from '../lib/api'
import { priorityLabels } from './labels'
import type { Provider } from '../providers/types'
import type { FinancialEntry } from './types'

const entrySchema = z.object({
  providerId: z.string().min(1, 'Selecione o prestador'),
  competencia: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use o formato AAAA-MM'),
  type: z.string().min(2, 'Informe o tipo de lançamento'),
  description: z.string().min(2, 'Informe a descrição'),
  amount: z
    .string()
    .min(1, 'Informe o valor')
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) > 0, 'Valor inválido'),
  expectedDate: z.string().min(1, 'Informe a data prevista'),
  dueDate: z.string().min(1, 'Informe o vencimento'),
  paymentMethod: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  notes: z.string().optional(),
})

type EntryFormValues = z.infer<typeof entrySchema>

export function FinancialEntryCreatePage() {
  const { accessToken } = useAuth()
  const navigate = useNavigate()
  const [providers, setProviders] = useState<Provider[] | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch<Provider[]>('/providers', { accessToken })
      .then(setProviders)
      .catch(() => setFormError('Não foi possível carregar os prestadores.'))
  }, [accessToken])

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EntryFormValues>({
    resolver: zodResolver(entrySchema),
    mode: 'onBlur',
  })

  const onSubmit = async (values: EntryFormValues) => {
    setFormError(null)
    try {
      const entry = await apiFetch<FinancialEntry>('/financial-entries', {
        method: 'POST',
        accessToken,
        body: {
          providerId: values.providerId,
          competencia: values.competencia,
          type: values.type,
          description: values.description,
          amount: Number(values.amount),
          expectedDate: values.expectedDate,
          dueDate: values.dueDate,
          paymentMethod: values.paymentMethod || undefined,
          priority: values.priority || undefined,
          notes: values.notes || undefined,
        },
      })
      await navigate(`/financial-entries/${entry.id}`)
    } catch {
      setFormError('Não foi possível criar o lançamento. Confira os dados e tente novamente.')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        Novo lançamento financeiro
      </h1>
      <Card className="mt-6 max-w-xl">
        <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="space-y-4">
          {formError ? <Alert>{formError}</Alert> : null}
          <Field label="Prestador" error={errors.providerId?.message}>
            <Controller
              control={control}
              name="providerId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  invalid={Boolean(errors.providerId)}
                  placeholder={providers ? 'Selecione o prestador' : 'Carregando...'}
                  options={(providers ?? []).map((provider) => ({
                    value: provider.id,
                    label: provider.legalName,
                  }))}
                />
              )}
            />
          </Field>
          <Field label="Competência" error={errors.competencia?.message}>
            <Input placeholder="AAAA-MM" invalid={Boolean(errors.competencia)} {...register('competencia')} />
          </Field>
          <Field label="Tipo" error={errors.type?.message}>
            <Input placeholder="Ex.: Remuneração base" invalid={Boolean(errors.type)} {...register('type')} />
          </Field>
          <Field label="Descrição" error={errors.description?.message}>
            <Input invalid={Boolean(errors.description)} {...register('description')} />
          </Field>
          <Field label="Valor" error={errors.amount?.message}>
            <Input type="number" step="0.01" invalid={Boolean(errors.amount)} {...register('amount')} />
          </Field>
          <Field label="Data prevista" error={errors.expectedDate?.message}>
            <Input type="date" invalid={Boolean(errors.expectedDate)} {...register('expectedDate')} />
          </Field>
          <Field label="Vencimento" error={errors.dueDate?.message}>
            <Input type="date" invalid={Boolean(errors.dueDate)} {...register('dueDate')} />
          </Field>
          <Field label="Forma de pagamento">
            <Input {...register('paymentMethod')} />
          </Field>
          <Field label="Prioridade">
            <Controller
              control={control}
              name="priority"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Sem prioridade definida"
                  options={Object.entries(priorityLabels).map(([value, label]) => ({ value, label }))}
                />
              )}
            />
          </Field>
          <Field label="Observações">
            <Input {...register('notes')} />
          </Field>
          <Button type="submit" loading={isSubmitting}>
            Criar lançamento
          </Button>
        </form>
      </Card>
    </div>
  )
}
