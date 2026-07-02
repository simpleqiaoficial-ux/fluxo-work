import type { ReactNode } from 'react'

export function CenteredPage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
