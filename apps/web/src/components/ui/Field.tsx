import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface FieldProps {
  label: string
  error?: string
  hint?: string
  children: ReactNode
  className?: string
}

export function Field({ label, error, hint, children, className }: FieldProps) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs text-red-600 dark:text-red-400">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-slate-500 dark:text-slate-400">{hint}</span>
      ) : null}
    </label>
  )
}
