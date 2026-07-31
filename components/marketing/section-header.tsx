import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function SectionHeader({
  eyebrow,
  title,
  lede,
  align = 'left',
  className,
  action,
}: {
  eyebrow: string
  title: ReactNode
  lede?: ReactNode
  align?: 'left' | 'center'
  className?: string
  action?: ReactNode
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-5',
        align === 'center' ? 'items-center text-center' : 'items-start',
        action && 'lg:flex-row lg:items-end lg:justify-between',
        className,
      )}
    >
      <div className={cn(align === 'center' ? 'max-w-3xl' : 'max-w-2xl')}>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="display-lg mt-4 text-ink">{title}</h2>
        {lede ? <p className="lede mt-4">{lede}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
