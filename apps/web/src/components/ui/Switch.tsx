import { forwardRef } from 'react'
import type { ComponentPropsWithoutRef } from 'react'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import { cn } from '@/lib/cn'

export type SwitchProps = ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      'relative h-5 w-9 shrink-0 rounded-full bg-slate-300 transition-colors duration-180',
      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
      'data-[state=checked]:bg-primary',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'dark:bg-white/10',
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="block size-4 translate-x-0.5 rounded-full bg-white transition-transform duration-180 data-[state=checked]:translate-x-[18px]" />
  </SwitchPrimitive.Root>
))
Switch.displayName = 'Switch'
