import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import {
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from '../lib/api'
import type { Provider } from '../providers/types'
import {
  entryStatusLabels,
  entryStatusTones,
  formatCurrency,
  formatDate,
  priorityLabels,
  stepStatusLabels,
  stepStatusTones,
} from './labels'
import type { FinancialEntry } from './types'

const editEntrySchema = z.object({
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

type EditEntryFormValues = z.infer<typeof editEntrySchema>

type DecisionScope = 'step' | 'finance'
type NegativeDecision = 'REJECT' | 'REQUEST_ADJUSTMENT'

export function FinancialEntryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { accessToken, userId, role } = useAuth()

  const [entry, setEntry] = useState<FinancialEntry | null>(null)
  const [provider, setProvider] = useState<Provider | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [decisionModal, setDecisionModal] = useState<{
    scope: DecisionScope
    decision: NegativeDecision
  } | null>(null)
  const [note, setNote] = useState('')
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const {
    control: editControl,
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEditForm,
    formState: { errors: editErrors, isSubmitting: isEditSubmitting },
  } = useForm<EditEntryFormValues>({ resolver: zodResolver(editEntrySchema) })

  const load = () => apiFetch<FinancialEntry>(`/financial-entries/${id}`, { accessToken }).then(setEntry)

  useEffect(() => {
    if (!id) return
    load().catch(() => setLoadError('Não foi possível carregar o lançamento.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, accessToken])

  useEffect(() => {
    if (!entry) return
    apiFetch<Provider>(`/providers/${entry.providerId}`, { accessToken })
      .then(setProvider)
      .catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.providerId, accessToken])

  const runAction = async (action: () => Promise<unknown>) => {
    setActionError(null)
    setBusy(true)
    try {
      await action()
      await load()
    } catch {
      setActionError('Não foi possível concluir a ação.')
    } finally {
      setBusy(false)
    }
  }

  const decide = (scope: DecisionScope, decision: 'APPROVE' | NegativeDecision, decisionNote?: string) => {
    const path = scope === 'step' ? 'step-decision' : 'finance-decision'
    return runAction(() =>
      apiFetch(`/financial-entries/${id}/${path}`, {
        method: 'POST',
        accessToken,
        body: { decision, note: decisionNote || undefined },
      }),
    )
  }

  const openNegativeDecision = (scope: DecisionScope, decision: NegativeDecision) => {
    setNote('')
    setDecisionModal({ scope, decision })
  }

  const confirmNegativeDecision = async () => {
    if (!decisionModal) return
    await decide(decisionModal.scope, decisionModal.decision, note)
    setDecisionModal(null)
  }

  const openEditModal = () => {
    if (!entry) return
    setEditError(null)
    resetEditForm({
      competencia: entry.competencia,
      type: entry.type,
      description: entry.description,
      amount: entry.amount,
      expectedDate: entry.expectedDate.slice(0, 10),
      dueDate: entry.dueDate.slice(0, 10),
      paymentMethod: entry.paymentMethod ?? '',
      priority: entry.priority ?? undefined,
      notes: entry.notes ?? '',
    })
    setEditModalOpen(true)
  }

  const onEditSubmit = async (values: EditEntryFormValues) => {
    setEditError(null)
    try {
      await apiFetch(`/financial-entries/${id}`, {
        method: 'PATCH',
        accessToken,
        body: {
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
      setEditModalOpen(false)
      await load()
    } catch {
      setEditError('Não foi possível salvar as alterações.')
    }
  }

  if (loadError) {
    return <Alert>{loadError}</Alert>
  }

  if (!entry) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Carregando...</p>
  }

  const isAdmin = role === 'ADMIN'
  const isFinance = role === 'FINANCEIRO' || isAdmin
  const isCreator = entry.createdByUserId === userId
  const canManageAsOwner = isCreator || isAdmin

  const canEditOrSubmit = canManageAsOwner && (entry.status === 'DRAFT' || entry.status === 'ADJUSTMENT_REQUESTED')
  const canCancel =
    canManageAsOwner &&
    (['DRAFT', 'IN_APPROVAL', 'ADJUSTMENT_REQUESTED', 'IN_FINANCE_REVIEW'] as const).includes(
      entry.status as never,
    )

  const pendingStep = entry.steps?.find((step) => step.status === 'PENDING')
  const canDecideStep =
    entry.status === 'IN_APPROVAL' && Boolean(pendingStep) && (pendingStep!.hierarchyAssignment.userId === userId || isAdmin)
  const canFinanceDecide = entry.status === 'IN_FINANCE_REVIEW' && isFinance
  const canMarkPaid = entry.status === 'SCHEDULED' && isFinance

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between">
          <CardTitle>
            Lançamento #{entry.entryNumber} — {entry.type}
          </CardTitle>
          <Badge tone={entryStatusTones[entry.status]}>{entryStatusLabels[entry.status]}</Badge>
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Prestador</dt>
            <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
              {provider?.legalName ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Competência</dt>
            <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">{entry.competencia}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Valor</dt>
            <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
              {formatCurrency(entry.amount)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Data prevista</dt>
            <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
              {formatDate(entry.expectedDate)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Vencimento</dt>
            <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">{formatDate(entry.dueDate)}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Prioridade</dt>
            <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
              {entry.priority ? priorityLabels[entry.priority] : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Forma de pagamento</dt>
            <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
              {entry.paymentMethod ?? '—'}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-slate-500 dark:text-slate-400">Descrição</dt>
            <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">{entry.description}</dd>
          </div>
          {entry.notes ? (
            <div className="col-span-3">
              <dt className="text-slate-500 dark:text-slate-400">Observações</dt>
              <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">{entry.notes}</dd>
            </div>
          ) : null}
        </dl>
      </Card>

      {actionError ? <Alert>{actionError}</Alert> : null}

      <div className="flex flex-wrap items-center gap-3">
        {canEditOrSubmit ? (
          <>
            <Button variant="secondary" disabled={busy} onClick={openEditModal}>
              Editar
            </Button>
            <Button
              disabled={busy}
              onClick={() => void runAction(() => apiFetch(`/financial-entries/${id}/submit`, { method: 'POST', accessToken }))}
            >
              Enviar para aprovação
            </Button>
          </>
        ) : null}
        {canDecideStep ? (
          <>
            <Button disabled={busy} onClick={() => void decide('step', 'APPROVE')}>
              Aprovar
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => openNegativeDecision('step', 'REQUEST_ADJUSTMENT')}>
              Pedir ajuste
            </Button>
            <Button variant="danger" disabled={busy} onClick={() => openNegativeDecision('step', 'REJECT')}>
              Recusar
            </Button>
          </>
        ) : null}
        {canFinanceDecide ? (
          <>
            <Button disabled={busy} onClick={() => void decide('finance', 'APPROVE')}>
              Aprovar (financeiro)
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => openNegativeDecision('finance', 'REQUEST_ADJUSTMENT')}
            >
              Pedir ajuste
            </Button>
            <Button variant="danger" disabled={busy} onClick={() => openNegativeDecision('finance', 'REJECT')}>
              Recusar
            </Button>
          </>
        ) : null}
        {canMarkPaid ? (
          <Button
            disabled={busy}
            onClick={() =>
              void runAction(() => apiFetch(`/financial-entries/${id}/mark-paid`, { method: 'POST', accessToken }))
            }
          >
            Marcar como pago
          </Button>
        ) : null}
        {canCancel ? (
          <Button
            variant="danger"
            disabled={busy}
            onClick={() =>
              void runAction(() => apiFetch(`/financial-entries/${id}/cancel`, { method: 'POST', accessToken }))
            }
          >
            Cancelar lançamento
          </Button>
        ) : null}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Cadeia de aprovação</h2>
        {!entry.steps || entry.steps.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Este lançamento ainda não foi enviado para aprovação.
          </p>
        ) : (
          <ol className="mt-3 space-y-2">
            {entry.steps.map((step) => (
              <li
                key={step.id}
                className="flex items-center justify-between rounded-card border border-slate-200 bg-light-card p-4 text-sm dark:border-dark-border dark:bg-dark-surface"
              >
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {step.sequence}. {step.hierarchyAssignment.approvalLevel.name} —{' '}
                    {step.hierarchyAssignment.user.name}
                  </p>
                  {step.note ? (
                    <p className="mt-1 text-slate-500 dark:text-slate-400">Justificativa: {step.note}</p>
                  ) : null}
                </div>
                <Badge tone={stepStatusTones[step.status]}>{stepStatusLabels[step.status]}</Badge>
              </li>
            ))}
          </ol>
        )}
      </div>

      <Modal open={Boolean(decisionModal)} onOpenChange={(open) => !open && setDecisionModal(null)}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>
              {decisionModal?.decision === 'REJECT' ? 'Recusar lançamento' : 'Pedir ajuste no lançamento'}
            </ModalTitle>
          </ModalHeader>
          <Field label="Justificativa">
            <Input value={note} onChange={(event) => setNote(event.target.value)} />
          </Field>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setDecisionModal(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              disabled={busy || !note.trim()}
              onClick={() => void confirmNegativeDecision()}
            >
              Confirmar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal open={editModalOpen} onOpenChange={setEditModalOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Editar lançamento</ModalTitle>
          </ModalHeader>
          <form
            onSubmit={(event) => void handleEditSubmit(onEditSubmit)(event)}
            className="max-h-[70vh] space-y-4 overflow-y-auto pr-1"
          >
            {editError ? <Alert>{editError}</Alert> : null}
            <Field label="Competência" error={editErrors.competencia?.message}>
              <Input placeholder="AAAA-MM" invalid={Boolean(editErrors.competencia)} {...registerEdit('competencia')} />
            </Field>
            <Field label="Tipo" error={editErrors.type?.message}>
              <Input invalid={Boolean(editErrors.type)} {...registerEdit('type')} />
            </Field>
            <Field label="Descrição" error={editErrors.description?.message}>
              <Input invalid={Boolean(editErrors.description)} {...registerEdit('description')} />
            </Field>
            <Field label="Valor" error={editErrors.amount?.message}>
              <Input type="number" step="0.01" invalid={Boolean(editErrors.amount)} {...registerEdit('amount')} />
            </Field>
            <Field label="Data prevista" error={editErrors.expectedDate?.message}>
              <Input type="date" invalid={Boolean(editErrors.expectedDate)} {...registerEdit('expectedDate')} />
            </Field>
            <Field label="Vencimento" error={editErrors.dueDate?.message}>
              <Input type="date" invalid={Boolean(editErrors.dueDate)} {...registerEdit('dueDate')} />
            </Field>
            <Field label="Forma de pagamento">
              <Input {...registerEdit('paymentMethod')} />
            </Field>
            <Field label="Prioridade">
              <Controller
                control={editControl}
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
              <Input {...registerEdit('notes')} />
            </Field>
            <ModalFooter>
              <Button type="button" variant="secondary" onClick={() => setEditModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={isEditSubmitting}>
                Salvar
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </div>
  )
}
