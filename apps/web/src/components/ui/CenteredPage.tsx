import type { ReactNode } from 'react'

export function CenteredPage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-light-bg px-4 dark:bg-dark-bg">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
