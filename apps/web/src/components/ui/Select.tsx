import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  name?: string
  id?: string
  invalid?: boolean
  className?: string
}

export function Select({
  value,
  defaultValue,
  onValueChange,
  options,
  placeholder = 'Selecione...',
  disabled,
  name,
  id,
  invalid = false,
  className,
}: SelectProps) {
  return (
    <SelectPrimitive.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      disabled={disabled}
      name={name}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-invalid={invalid || undefined}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-control border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 transition-colors duration-180',
          'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30',
          'disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-slate-400',
          'dark:border-dark-border dark:bg-dark-surface dark:text-slate-100',
          invalid && 'border-red-500 dark:border-red-500',
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown className="size-4 text-slate-400" aria-hidden="true" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className="z-50 max-h-72 overflow-hidden rounded-control border border-slate-200 bg-white text-slate-900 shadow-sm dark:border-dark-border dark:bg-dark-surface dark:text-slate-100"
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className="relative flex cursor-pointer select-none items-center rounded-base py-1.5 pl-7 pr-2 text-sm outline-none data-[highlighted]:bg-slate-100 dark:data-[highlighted]:bg-white/5"
              >
                <span className="absolute left-2 flex size-3.5 items-center justify-center">
                  <SelectPrimitive.ItemIndicator>
                    <Check className="size-3.5 text-primary" aria-hidden="true" />
                  </SelectPrimitive.ItemIndicator>
                </span>
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
