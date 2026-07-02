import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid = false, ...props }, ref) => {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'block w-full rounded-control border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 transition-colors duration-180 placeholder:text-slate-400',
          'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'dark:border-dark-border dark:bg-dark-surface dark:text-slate-100 dark:placeholder:text-slate-500',
          invalid &&
            'border-red-500 focus:border-red-500 focus:ring-red-500/30 dark:border-red-500',
          className,
        )}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'
