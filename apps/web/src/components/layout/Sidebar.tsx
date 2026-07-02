import { useLocation } from 'react-router'
import { PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { cn } from '@/lib/cn'
import { routeRegistry } from './route-registry'
import { SidebarNavItem } from './SidebarNavItem'

export interface SidebarProps {
  collapsed: boolean
  onToggleCollapsed: () => void
  onOpenSearch: () => void
  recentPaths: string[]
}

export function Sidebar({ collapsed, onToggleCollapsed, onOpenSearch, recentPaths }: SidebarProps) {
  const { role } = useAuth()
  const location = useLocation()

  const navItems = routeRegistry.filter(
    (item) => item.group === 'Navegação' && (!item.requiresRole || item.requiresRole === role),
  )

  const recentItems = recentPaths
    .filter((path) => path !== location.pathname)
    .map((path) => routeRegistry.find((item) => item.path === path))
    .filter((item): item is (typeof routeRegistry)[number] => Boolean(item))
    .slice(0, 5)

  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col gap-6 border-r border-slate-200 bg-light-card p-4 transition-[width] duration-180 dark:border-dark-border dark:bg-dark-surface',
        collapsed ? 'w-[72px]' : 'w-64',
      )}
    >
      <div className={cn('flex items-center gap-2', collapsed && 'justify-center')}>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-base bg-primary text-sm font-bold text-white">
          F
        </span>
        {!collapsed ? (
          <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            FluxoWork
          </span>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onOpenSearch}
        className={cn(
          'flex items-center gap-2 rounded-control border border-slate-300 px-3 py-1.5 text-sm text-slate-500 transition-colors duration-180 hover:border-slate-400 dark:border-dark-border dark:text-slate-400 dark:hover:border-slate-600',
          collapsed && 'justify-center px-0',
        )}
      >
        <Search className="size-4 shrink-0" aria-hidden="true" />
        {!collapsed ? <span>Pesquisar...</span> : null}
      </button>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto">
        {recentItems.length > 0 ? (
          <div className="flex flex-col gap-1">
            {!collapsed ? (
              <h3 className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Recentes
              </h3>
            ) : null}
            {recentItems.map((item) => (
              <SidebarNavItem
                key={item.path}
                to={item.path}
                label={item.label}
                icon={item.icon}
                collapsed={collapsed}
                active={location.pathname === item.path}
              />
            ))}
          </div>
        ) : null}

        <div className="flex flex-col gap-1">
          {!collapsed ? (
            <h3 className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Navegação
            </h3>
          ) : null}
          {navItems.map((item) => (
            <SidebarNavItem
              key={item.path}
              to={item.path}
              label={item.label}
              icon={item.icon}
              collapsed={collapsed}
              active={location.pathname === item.path}
            />
          ))}
        </div>
      </nav>

      <button
        type="button"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        className={cn(
          'flex items-center gap-2 rounded-base px-3 py-2 text-sm text-slate-500 transition-colors duration-180 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5',
          collapsed && 'justify-center px-0',
        )}
      >
        {collapsed ? (
          <PanelLeftOpen className="size-4 shrink-0" aria-hidden="true" />
        ) : (
          <>
            <PanelLeftClose className="size-4 shrink-0" aria-hidden="true" />
            <span>Recolher</span>
          </>
        )}
      </button>
    </aside>
  )
}
