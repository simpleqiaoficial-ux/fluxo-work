import { useLocation } from 'react-router'
import { Moon, Search, Sun } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { useTheme } from '@/theme/useTheme'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { Breadcrumb } from '../ui/Breadcrumb'
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger } from '../ui/Dropdown'
import { Tooltip } from '../ui/Tooltip'
import { buildBreadcrumb } from './breadcrumb'

export interface HeaderProps {
  onOpenSearch: () => void
}

export function Header({ onOpenSearch }: HeaderProps) {
  const { memberships, companyId, role, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()

  const currentCompany = memberships.find((m) => m.companyId === companyId)
  const breadcrumbItems = buildBreadcrumb(location.pathname)

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-light-card px-6 dark:border-dark-border dark:bg-dark-surface">
      <Breadcrumb items={breadcrumbItems} />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex items-center gap-2 rounded-control border border-slate-300 px-3 py-1.5 text-sm text-slate-500 transition-colors duration-180 hover:border-slate-400 dark:border-dark-border dark:text-slate-400 dark:hover:border-slate-600"
        >
          <Search className="size-4" aria-hidden="true" />
          Pesquisar
          <kbd className="ml-2 rounded-base border border-slate-300 px-1.5 py-0.5 text-[10px] text-slate-400 dark:border-dark-border dark:text-slate-500">
            Ctrl K
          </kbd>
        </button>

        <Tooltip content={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Alternar tema"
            className="rounded-base p-2 text-slate-500 transition-colors duration-180 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"
          >
            {theme === 'dark' ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
          </button>
        </Tooltip>

        <Dropdown>
          <DropdownTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-base p-1 transition-colors duration-180 hover:bg-slate-100 dark:hover:bg-white/5"
            >
              <Avatar name={currentCompany?.companyName ?? 'FluxoWork'} size="sm" />
            </button>
          </DropdownTrigger>
          <DropdownContent align="end">
            <DropdownLabel>{currentCompany?.companyName ?? 'Conta'}</DropdownLabel>
            {role ? (
              <div className="px-2 py-1">
                <Badge tone="neutral">{role}</Badge>
              </div>
            ) : null}
            <DropdownSeparator />
            <DropdownItem onSelect={() => void logout()}>Sair</DropdownItem>
          </DropdownContent>
        </Dropdown>
      </div>
    </header>
  )
}
