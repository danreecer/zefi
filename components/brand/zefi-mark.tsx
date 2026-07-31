import { cn } from '@/lib/utils'
import {
  SYMBOL_VIEWBOX,
  WORDMARK_E,
  WORDMARK_F,
  WORDMARK_F_ARM,
  WORDMARK_I,
  WORDMARK_I_DOT,
  WORDMARK_STROKE,
  WORDMARK_VIEWBOX,
  WORDMARK_Z,
  ZEFI_NODE,
  ZEFI_RAIL_BOTTOM,
  ZEFI_RAIL_TOP,
  ZEFI_ROUTE_ALT_A,
  ZEFI_ROUTE_ALT_B,
  ZEFI_ROUTE_MAIN,
} from './geometry'

type Tone = 'ink' | 'ivory' | 'mono' | 'ember'

const TONES: Record<Tone, { structure: string; route: string; alt: string; node: string }> = {
  ink: { structure: '#17130F', route: '#17130F', alt: '#17130F', node: '#ED4F08' },
  ivory: { structure: '#FDFAF4', route: '#FDFAF4', alt: '#FDFAF4', node: '#FF9A3D' },
  mono: { structure: 'currentColor', route: 'currentColor', alt: 'currentColor', node: 'currentColor' },
  ember: { structure: '#C23C06', route: '#ED4F08', alt: '#ED4F08', node: '#17130F' },
}

export function ZefiMark({
  className,
  tone = 'ink',
  showAlternates = true,
  title,
}: {
  className?: string
  tone?: Tone
  /** Alternate routes are dropped below ~24px, where they read as noise. */
  showAlternates?: boolean
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
      {showAlternates ? (
        <g stroke={c.alt} strokeWidth={1.2} strokeLinecap="round" opacity={0.42}>
          <path d={ZEFI_ROUTE_ALT_A} />
          <path d={ZEFI_ROUTE_ALT_B} />
        </g>
      ) : null}
      <g strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <path d={ZEFI_RAIL_TOP} stroke={c.structure} />
        <path d={ZEFI_ROUTE_MAIN} stroke={c.route} />
        <path d={ZEFI_RAIL_BOTTOM} stroke={c.structure} />
      </g>
      <circle cx={ZEFI_NODE.cx} cy={ZEFI_NODE.cy} r={ZEFI_NODE.r} fill={c.node} />
    </svg>
  )
}

export function ZefiWordmark({
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
      viewBox={WORDMARK_VIEWBOX}
      className={cn('block', className)}
      fill="none"
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      <g
        stroke={c.structure}
        strokeWidth={WORDMARK_STROKE}
        strokeLinecap="butt"
        strokeLinejoin="miter"
        strokeMiterlimit={6}
      >
        <path d={WORDMARK_Z} />
        <path d={WORDMARK_E} />
        <path d={WORDMARK_F} />
        <path d={WORDMARK_F_ARM} />
        <path d={WORDMARK_I} />
      </g>
      <circle cx={WORDMARK_I_DOT.cx} cy={WORDMARK_I_DOT.cy} r={WORDMARK_I_DOT.r} fill={c.node} />
    </svg>
  )
}

/** Horizontal lockup: symbol + wordmark, optically aligned. */
export function ZefiLogo({
  className,
  tone = 'ink',
  label = 'ZeFi',
}: {
  className?: string
  tone?: Tone
  label?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)} aria-label={label} role="img">
      <ZefiMark className="h-[1.55em] w-[1.55em] shrink-0" tone={tone} />
      <ZefiWordmark className="h-[0.92em] w-auto shrink-0" tone={tone} />
    </span>
  )
}

/** Vertical lockup for square placements and the launch kit. */
export function ZefiLogoStacked({ className, tone = 'ink' }: { className?: string; tone?: Tone }) {
  return (
    <span className={cn('inline-flex flex-col items-center gap-3', className)} aria-label="ZeFi" role="img">
      <ZefiMark className="h-[2.6em] w-[2.6em]" tone={tone} />
      <ZefiWordmark className="h-[0.9em] w-auto" tone={tone} />
    </span>
  )
}
