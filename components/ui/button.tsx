import { Slot } from '@radix-ui/react-slot'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/utils'

type Variant = 'primary' | 'ember' | 'paper' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary: 'btn-primary',
  ember: 'btn-ember',
  paper: 'btn-paper',
  ghost: 'btn-ghost',
}

const SIZES: Record<Size, string> = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  /** Render as the child element — used for links that should look like buttons. */
  asChild?: boolean
  children?: ReactNode
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  asChild = false,
  type,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : 'button'
  return (
    <Component
      className={cn('btn', VARIANTS[variant], SIZES[size], className)}
      {...(asChild ? {} : { type: type ?? 'button' })}
      {...props}
    />
  )
}
