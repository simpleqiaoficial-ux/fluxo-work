import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const alertVariants = cva('flex items-start gap-2 rounded-control border px-3 py-2 text-sm', {
  variants: {
    tone: {
      danger:
        'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400',
      warning:
        'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400',
      success:
        'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400',
      info: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400',
    },
  },
  defaultVariants: { tone: 'danger' },
})

const icons = { danger: XCircle, warning: AlertTriangle, success: CheckCircle2, info: Info } as const

export interface AlertProps extends VariantProps<typeof alertVariants> {
  children: ReactNode
  className?: string
}

export function Alert({ children, tone = 'danger', className }: AlertProps) {
  const Icon = icons[tone ?? 'danger']
  return (
    <div role="alert" className={cn(alertVariants({ tone }), className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}
