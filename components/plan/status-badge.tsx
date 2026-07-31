import { PLAN_STATUS_LABELS, PLAN_STATUS_TONE, type PlanStatus } from '@/lib/planner/types'
import { cn } from '@/lib/utils'

const TONE_CLASS = {
  neutral: 'chip',
  progress: 'chip chip-info',
  positive: 'chip chip-positive',
  caution: 'chip chip-caution',
  critical: 'chip chip-critical',
} as const

export function PlanStatusBadge({ status, className }: { status: PlanStatus; className?: string }) {
  const tone = PLAN_STATUS_TONE[status]
  return (
    <span className={cn(TONE_CLASS[tone], className)}>
      {tone === 'progress' ? (
        <span className="inline-block h-1.5 w-1.5 animate-pulse-soft rounded-full bg-current" />
      ) : null}
      {PLAN_STATUS_LABELS[status]}
    </span>
  )
}

export function SeverityBadge({ severity }: { severity: 'info' | 'caution' | 'critical' }) {
  const map = {
    info: { cls: 'chip chip-info', label: 'Info' },
    caution: { cls: 'chip chip-caution', label: 'Caution' },
    critical: { cls: 'chip chip-critical', label: 'Critical' },
  } as const
  return <span className={map[severity].cls}>{map[severity].label}</span>
}

export function ExecutionModeBadge({
  mode,
  requirement,
}: {
  mode: 'wallet_signature' | 'provider_required' | 'informational'
  requirement?: string | undefined
}) {
  if (mode === 'wallet_signature') {
    return <span className="chip chip-positive">Wallet signature</span>
  }
  if (mode === 'provider_required') {
    return <span className="chip chip-caution">{requirement ?? 'Provider integration required'}</span>
  }
  return <span className="chip">No signature</span>
}
