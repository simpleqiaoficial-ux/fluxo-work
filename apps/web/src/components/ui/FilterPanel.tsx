import { PanelLeftClose, PanelLeftOpen, Search, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Checkbox } from './Checkbox'
import { Input } from './Input'

export interface FilterOption {
  value: string
  label: string
  count?: number
}

export interface FilterGroup {
  id: string
  title: string
  options: FilterOption[]
}

export interface FilterPanelProps {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  groups: FilterGroup[]
  selectedValues: Record<string, string[]>
  onToggleValue: (groupId: string, value: string) => void
  onClear: () => void
  collapsed?: boolean
  onToggleCollapsed?: () => void
  className?: string
}

export function FilterPanel({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  groups,
  selectedValues,
  onToggleValue,
  onClear,
  collapsed = false,
  onToggleCollapsed,
  className,
}: FilterPanelProps) {
  const activeCount = Object.values(selectedValues).reduce((total, values) => total + values.length, 0)

  if (collapsed) {
    return (
      <div
        className={cn(
          'flex h-fit flex-col items-center gap-3 rounded-card border border-slate-200 p-3 dark:border-dark-border',
          className,
        )}
      >
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label="Expandir filtros"
          className="rounded-base p-1.5 text-slate-500 transition-colors duration-180 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"
        >
          <PanelLeftOpen className="size-4" aria-hidden="true" />
        </button>
        {activeCount > 0 ? (
          <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-white">
            {activeCount}
          </span>
        ) : null}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex w-72 shrink-0 flex-col gap-5 rounded-card border border-slate-200 p-4 dark:border-dark-border',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Filtros</h2>
        <div className="flex items-center gap-1">
          {activeCount > 0 ? (
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-medium text-primary hover:text-primary-hover"
            >
              Limpar
            </button>
          ) : null}
          {onToggleCollapsed ? (
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label="Recolher filtros"
              className="rounded-base p-1.5 text-slate-500 transition-colors duration-180 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"
            >
              <PanelLeftClose className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <Input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9"
        />
        {searchValue ? (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label="Limpar busca"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {groups.map((group) => (
        <div key={group.id} className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {group.title}
          </h3>
          <div className="flex flex-col gap-1.5">
            {group.options.map((option) => {
              const checked = selectedValues[group.id]?.includes(option.value) ?? false
              return (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center justify-between gap-2 rounded-base px-1.5 py-1 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"
                >
                  <span className="flex items-center gap-2">
                    <Checkbox checked={checked} onCheckedChange={() => onToggleValue(group.id, option.value)} />
                    {option.label}
                  </span>
                  {option.count !== undefined ? (
                    <span className="text-xs text-slate-400 dark:text-slate-500">{option.count}</span>
                  ) : null}
                </label>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
