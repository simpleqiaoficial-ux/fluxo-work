import { Link } from 'react-router'
import type { ComponentType } from 'react'
import { cn } from '@/lib/cn'

export interface SidebarNavItemProps {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  collapsed?: boolean
  active?: boolean
}

export function SidebarNavItem({ to, label, icon: Icon, collapsed = false, active = false }: SidebarNavItemProps) {
  return (
    <Link
      to={to}
      title={collapsed ? label : undefined}
      className={cn(
        'flex items-center gap-3 rounded-base px-3 py-2 text-sm font-medium transition-colors duration-180',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5',
        collapsed && 'justify-center px-0',
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {!collapsed ? <span className="truncate">{label}</span> : null}
    </Link>
  )
}
