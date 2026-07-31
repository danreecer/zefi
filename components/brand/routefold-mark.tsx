import { cn } from '@/lib/utils'
import {
  ROUTEFOLD_BRANCH_DOWN,
  ROUTEFOLD_BRANCH_MID,
  ROUTEFOLD_BRANCH_UP,
  ROUTEFOLD_NODE,
  ROUTEFOLD_NODE_DOWN,
  ROUTEFOLD_NODE_UP,
  ROUTEFOLD_SPINE,
  SYMBOL_VIEWBOX,
} from './geometry'

type Tone = 'ink' | 'ivory' | 'mono' | 'ember'

const TONES: Record<Tone, { stroke: string; node: string }> = {
  ink: { stroke: '#17130F', node: '#ED4F08' },
  ivory: { stroke: '#FDFAF4', node: '#FF9A3D' },
  mono: { stroke: 'currentColor', node: 'currentColor' },
  ember: { stroke: '#C23C06', node: '#17130F' },
}

/**
 * Routefold: one product, unfolded into ranked destinations.
 * The deliberate inverse of the ZeFi mark — same stroke language and node
 * vocabulary, opposite direction of travel.
 */
export function RoutefoldMark({
  className,
  tone = 'ink',
  title,
}: {
  className?: string
  tone?: Tone
  title?: string
}) {
  const c = TONES[tone]
  return (
    <svg
      viewBox={SYMBOL_VIEWBOX}
      className={cn('block', className)}
      fill="none"
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      <path d={ROUTEFOLD_SPINE} stroke={c.stroke} strokeWidth={1.6} strokeLinecap="round" opacity={0.38} />
      <g stroke={c.stroke} strokeWidth={2} strokeLinecap="round" opacity={0.5}>
        <path d={ROUTEFOLD_BRANCH_UP} />
        <path d={ROUTEFOLD_BRANCH_DOWN} />
      </g>
      <path d={ROUTEFOLD_BRANCH_MID} stroke={c.stroke} strokeWidth={3} strokeLinecap="round" />
      <g fill={c.stroke} opacity={0.5}>
        <circle cx={ROUTEFOLD_NODE_UP.cx} cy={ROUTEFOLD_NODE_UP.cy} r={ROUTEFOLD_NODE_UP.r} />
        <circle cx={ROUTEFOLD_NODE_DOWN.cx} cy={ROUTEFOLD_NODE_DOWN.cy} r={ROUTEFOLD_NODE_DOWN.r} />
      </g>
      <circle cx={ROUTEFOLD_NODE.cx} cy={ROUTEFOLD_NODE.cy} r={ROUTEFOLD_NODE.r} fill={c.node} />
    </svg>
  )
}

export function RoutefoldLogo({ className, tone = 'ink' }: { className?: string; tone?: Tone }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)} role="img" aria-label="Routefold">
      <RoutefoldMark className="h-[1.5em] w-[1.5em] shrink-0" tone={tone} />
      <span
        className="font-display text-[1em] leading-none font-medium tracking-[-0.02em]"
        style={{ color: tone === 'ivory' ? '#FDFAF4' : tone === 'ember' ? '#C23C06' : undefined }}
      >
        Routefold
      </span>
    </span>
  )
}
