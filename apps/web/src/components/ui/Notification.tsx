import { Toaster as SonnerToaster } from 'sonner'
import { useTheme } from '@/theme/useTheme'

export { toast } from 'sonner'

export function Toaster() {
  const { theme } = useTheme()
  return (
    <SonnerToaster
      theme={theme}
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            'rounded-control border border-slate-200 bg-light-card text-slate-900 shadow-sm dark:border-dark-border dark:bg-dark-surface dark:text-slate-100',
          title: 'text-sm font-medium',
          description: 'text-sm text-slate-500 dark:text-slate-400',
        },
      }}
    />
  )
}
