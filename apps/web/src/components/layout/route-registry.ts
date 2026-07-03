import { LayoutDashboard, Receipt, UserPlus, Users } from 'lucide-react'
import type { ComponentType } from 'react'

export interface RouteRegistryItem {
  path: string
  label: string
  group: 'Navegação' | 'Ações'
  icon: ComponentType<{ className?: string }>
  requiresRole?: 'ADMIN'
}

// Registro estático das páginas do sistema — usado pela busca global
// (CommandPalette) e pela navegação da Sidebar. Sem busca no back-end nesta
// fatia: é só um índice client-side das rotas que já existem.
export const routeRegistry: RouteRegistryItem[] = [
  { path: '/', label: 'Resumo', group: 'Navegação', icon: LayoutDashboard },
  { path: '/providers', label: 'Prestadores', group: 'Navegação', icon: Users },
  { path: '/financial-entries', label: 'Lançamentos', group: 'Navegação', icon: Receipt },
  {
    path: '/providers/new',
    label: 'Novo prestador',
    group: 'Ações',
    icon: UserPlus,
    requiresRole: 'ADMIN',
  },
  {
    path: '/financial-entries/new',
    label: 'Novo lançamento',
    group: 'Ações',
    icon: Receipt,
  },
]
