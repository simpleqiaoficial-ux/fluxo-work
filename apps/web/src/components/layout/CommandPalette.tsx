import { useEffect } from 'react'
import { Command } from 'cmdk'
import { useNavigate } from 'react-router'
import { useAuth } from '@/auth/AuthContext'
import { routeRegistry } from './route-registry'

export interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const GROUPS = ['Navegação', 'Ações'] as const

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate()
  const { role } = useAuth()

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  const items = routeRegistry.filter((item) => !item.requiresRole || item.requiresRole === role)

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Busca global"
      overlayClassName="fx-fade fixed inset-0 z-50 bg-black/50"
      contentClassName="fx-scale-in fixed left-1/2 top-24 z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-modal border border-slate-200 bg-light-card shadow-sm dark:border-dark-border dark:bg-dark-surface"
    >
      <div className="border-b border-slate-200 px-4 dark:border-dark-border">
        <Command.Input
          placeholder="Buscar páginas e ações..."
          className="h-12 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
        />
      </div>
      <Command.List className="max-h-80 overflow-y-auto p-2">
        <Command.Empty className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Nenhum resultado encontrado.
        </Command.Empty>
        {GROUPS.map((group) => {
          const groupItems = items.filter((item) => item.group === group)
          if (groupItems.length === 0) return null
          return (
            <Command.Group key={group} heading={group}>
              {groupItems.map((item) => (
                <Command.Item
                  key={item.path}
                  value={item.label}
                  onSelect={() => {
                    navigate(item.path)
                    onOpenChange(false)
                  }}
                  className="flex cursor-pointer items-center gap-2 rounded-base px-2 py-2 text-sm text-slate-700 data-[selected=true]:bg-slate-100 dark:text-slate-300 dark:data-[selected=true]:bg-white/5"
                >
                  <item.icon className="size-4 text-slate-400" aria-hidden="true" />
                  {item.label}
                </Command.Item>
              ))}
            </Command.Group>
          )
        })}
      </Command.List>
    </Command.Dialog>
  )
}
