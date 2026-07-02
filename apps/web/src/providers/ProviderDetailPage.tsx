import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import type { ColumnDef } from '@tanstack/react-table'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Table } from '@/components/ui/Table'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from '../lib/api'
import type { CommercialAgreement, Provider } from './types'

const agreementTypeLabels: Record<CommercialAgreement['type'], string> = {
  HOURLY: 'Por hora',
  FIXED_PER_ACTIVITY: 'Fixo por atividade',
  MONTHLY: 'Mensal',
}

const agreementStatusLabels: Record<CommercialAgreement['status'], string> = {
  ACTIVE: 'Ativo',
  SUSPENDED: 'Suspenso',
  TERMINATED: 'Encerrado',
}

const agreementColumns: ColumnDef<CommercialAgreement>[] = [
  {
    accessorKey: 'type',
    header: 'Tipo',
    cell: (info) => agreementTypeLabels[info.getValue<CommercialAgreement['type']>()],
  },
  {
    accessorKey: 'baseRate',
    header: 'Valor acordado',
    cell: (info) => `R$ ${info.getValue<string>()}`,
  },
  { accessorKey: 'scopeDescription', header: 'Escopo' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: (info) => {
      const status = info.getValue<CommercialAgreement['status']>()
      const tone = status === 'ACTIVE' ? 'success' : status === 'SUSPENDED' ? 'warning' : 'neutral'
      return <Badge tone={tone}>{agreementStatusLabels[status]}</Badge>
    },
  },
]

const agreementSchema = z.object({
  type: z.enum(['HOURLY', 'FIXED_PER_ACTIVITY', 'MONTHLY']),
  baseRate: z
    .string()
    .min(1, 'Informe o valor acordado')
    .refine((value) => !Number.isNaN(Number(value)), 'Valor inválido'),
  scopeDescription: z.string().min(1, 'Informe o escopo'),
  startDate: z.string().min(1, 'Informe o início da vigência'),
})

type AgreementFormValues = z.infer<typeof agreementSchema>

export function ProviderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { accessToken, role } = useAuth()

  const [provider, setProvider] = useState<Provider | null>(null)
  const [agreements, setAgreements] = useState<CommercialAgreement[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AgreementFormValues>({
    resolver: zodResolver(agreementSchema),
    mode: 'onBlur',
    defaultValues: { type: 'HOURLY', baseRate: '', scopeDescription: '', startDate: '' },
  })

  const loadAgreements = () =>
    apiFetch<CommercialAgreement[]>(`/providers/${id}/commercial-agreements`, { accessToken }).then(
      setAgreements,
    )

  useEffect(() => {
    if (!id) return
    apiFetch<Provider>(`/providers/${id}`, { accessToken })
      .then(setProvider)
      .catch(() => setLoadError('Não foi possível carregar o prestador.'))
    loadAgreements().catch(() => setLoadError('Não foi possível carregar os acordos comerciais.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, accessToken])

  const onSubmit = async (values: AgreementFormValues) => {
    setFormError(null)
    try {
      await apiFetch(`/providers/${id}/commercial-agreements`, {
        method: 'POST',
        accessToken,
        body: {
          type: values.type,
          baseRate: Number(values.baseRate),
          scopeDescription: values.scopeDescription,
          startDate: values.startDate,
        },
      })
      reset()
      await loadAgreements()
    } catch {
      setFormError('Não foi possível criar o acordo comercial.')
    }
  }

  if (loadError) {
    return <Alert>{loadError}</Alert>
  }

  if (!provider) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Carregando...</p>
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between">
          <CardTitle>{provider.legalName}</CardTitle>
          <Badge tone={provider.status === 'ACTIVE' ? 'success' : 'neutral'}>
            {provider.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">CNPJ</dt>
            <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">{provider.cnpj}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Contato</dt>
            <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">{provider.contactName}</dd>
          </div>
        </dl>
      </Card>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Acordos comerciais</h2>
        <div className="mt-3">
          <Table
            data={agreements ?? []}
            columns={agreementColumns}
            isLoading={!agreements}
            emptyState="Nenhum acordo comercial ainda."
          />
        </div>
      </div>

      {role === 'ADMIN' ? (
        <Card className="max-w-xl">
          <CardTitle>Novo acordo comercial</CardTitle>
          <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="mt-4 space-y-4">
            {formError ? <Alert>{formError}</Alert> : null}
            <Field label="Tipo" error={errors.type?.message}>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    options={[
                      { value: 'HOURLY', label: 'Por hora' },
                      { value: 'FIXED_PER_ACTIVITY', label: 'Fixo por atividade' },
                      { value: 'MONTHLY', label: 'Mensal' },
                    ]}
                  />
                )}
              />
            </Field>
            <Field label="Valor acordado" error={errors.baseRate?.message}>
              <Input type="number" step="0.01" invalid={Boolean(errors.baseRate)} {...register('baseRate')} />
            </Field>
            <Field label="Escopo" error={errors.scopeDescription?.message}>
              <Input invalid={Boolean(errors.scopeDescription)} {...register('scopeDescription')} />
            </Field>
            <Field label="Início da vigência" error={errors.startDate?.message}>
              <Input type="date" invalid={Boolean(errors.startDate)} {...register('startDate')} />
            </Field>
            <Button type="submit" loading={isSubmitting}>
              Criar acordo
            </Button>
          </form>
        </Card>
      ) : null}
    </div>
  )
}
