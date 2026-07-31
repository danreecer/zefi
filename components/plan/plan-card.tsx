import { AlertTriangle, Check, CircleDashed, Info, Minus, X } from 'lucide-react'
import type { ReactNode } from 'react'

import { explorerAddressUrl, getChain } from '@/lib/chains/registry'
import type { SimulationCheck, TransactionPlan } from '@/lib/planner/types'
import { describeSimulation } from '@/lib/simulation/types'
import { cn, formatDateTime, formatDuration, formatUsd, truncateAddress } from '@/lib/utils'
import { ExecutionModeBadge, PlanStatusBadge, SeverityBadge } from './status-badge'

/**
 * The transaction plan.
 *
 * The same component renders the marketing demonstration and the real plan in
 * the application, so what a visitor is shown is literally the interface they
 * will use. Four things are always present and never optional:
 *
 *   • what ZeFi understood, next to what the user actually wrote
 *   • which steps a wallet can sign and which need a provider
 *   • where every number came from, and when it was read
 *   • a confirmation control labelled with the real action
 */
export function PlanCard({
  plan,
  footer,
  className,
  compact = false,
}: {
  plan: TransactionPlan
  /** The approval control. Omitted on marketing surfaces. */
  footer?: ReactNode
  className?: string
  compact?: boolean
}) {
  const signable = plan.actions.filter((action) => action.executionMode === 'wallet_signature').length

  return (
    <article className={cn('panel-solid overflow-hidden', className)}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="label-tech text-ink-soft">Transaction plan</span>
          {plan.illustrative ? <span className="chip chip-ember">Illustrative</span> : null}
        </div>
        <PlanStatusBadge status={plan.status} />
      </header>

      <div className="space-y-6 px-5 py-6 sm:px-6">
        {/* ── Request vs interpretation ────────────────────────────────── */}
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <Block label="You asked">
            <p className="text-[0.9375rem] leading-relaxed text-ink [overflow-wrap:anywhere]">“{plan.request}”</p>
          </Block>
          <Block label="ZeFi understood">
            <p className="text-[0.9375rem] leading-relaxed text-ink [overflow-wrap:anywhere]">{plan.interpretedIntent}</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className="chip chip-ember">{plan.intentType}</span>
              <span className="num text-[0.6875rem] text-ink-muted">
                confidence {plan.intent.confidence.toFixed(2)}
              </span>
            </div>
          </Block>
        </div>

        {plan.intent.assumptions.length > 0 ? (
          <Block label="Assumptions ZeFi made">
            <ul className="space-y-1.5">
              {plan.intent.assumptions.map((assumption) => (
                <li key={assumption} className="flex gap-2 text-[0.875rem] leading-snug text-ink-soft">
                  <Minus className="mt-1.5 h-2.5 w-2.5 shrink-0 text-ink-faint" aria-hidden="true" />
                  {assumption}
                </li>
              ))}
            </ul>
          </Block>
        ) : null}

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <section aria-labelledby={`${plan.id}-actions`}>
          <div className="flex items-baseline justify-between gap-3">
            <h3 id={`${plan.id}-actions`} className="label-tech text-ink-soft">
              Sequence of actions
            </h3>
            <span className="num text-[0.6875rem] text-ink-muted">
              {plan.actions.length} step{plan.actions.length === 1 ? '' : 's'} · {signable} signable
            </span>
          </div>

          <ol className="mt-3 min-w-0 space-y-2.5">
            {plan.actions.map((action) => {
              const chain = getChain(action.chainKey)
              return (
                <li
                  key={`${action.index}-${action.title}`}
                  className="min-w-0 rounded-xl border border-line bg-ivory/60 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="num mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-line bg-white text-[0.6875rem] text-ink-muted">
                        {action.index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[0.9375rem] leading-snug font-medium text-ink">{action.title}</p>
                        <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-soft">
                          {action.description}
                        </p>
                      </div>
                    </div>
                    <ExecutionModeBadge mode={action.executionMode} requirement={action.providerRequirement} />
                  </div>

                  {!compact ? (
                    <dl className="mt-3 grid gap-x-6 gap-y-1.5 border-t border-line pt-3 sm:grid-cols-2">
                      <MicroRow label="Network" value={chain?.name ?? action.chainKey} />
                      {action.functionSignature ? (
                        <MicroRow label="Function" value={action.functionSignature} mono />
                      ) : null}
                      {action.contractAddress ? (
                        <MicroRow
                          label="Contract"
                          value={truncateAddress(action.contractAddress)}
                          href={explorerAddressUrl(action.chainKey, action.contractAddress)}
                          mono
                        />
                      ) : null}
                      {action.recipient ? (
                        <MicroRow
                          label="Recipient"
                          value={truncateAddress(action.recipient)}
                          href={explorerAddressUrl(action.chainKey, action.recipient)}
                          mono
                        />
                      ) : null}
                    </dl>
                  ) : null}
                </li>
              )
            })}
          </ol>
        </section>

        {/* ── Estimates ────────────────────────────────────────────────── */}
        <section aria-labelledby={`${plan.id}-estimates`}>
          <h3 id={`${plan.id}-estimates`} className="label-tech text-ink-soft">
            Estimates
          </h3>
          <div className="mt-3 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Network cost"
              value={
                plan.estimates.networkCostNative
                  ? `${plan.estimates.networkCostNative} ${plan.estimates.networkCostSymbol ?? ''}`.trim()
                  : 'Not established'
              }
              sub={plan.estimates.networkCostUsd !== null ? formatUsd(plan.estimates.networkCostUsd) : undefined}
              muted={plan.estimates.networkCostNative === null}
            />
            <Stat
              label="Slippage"
              value={plan.estimates.slippagePercent === null ? 'Not applicable' : `${plan.estimates.slippagePercent}%`}
              muted={plan.estimates.slippagePercent === null}
            />
            <Stat
              label="Execution time"
              value={
                plan.estimates.estimatedSeconds
                  ? formatDuration(plan.estimates.estimatedSeconds)
                  : 'Not established'
              }
              muted={plan.estimates.estimatedSeconds === null}
            />
            <Stat
              label="Approvals"
              value={plan.approvals.length === 0 ? 'None' : `${plan.approvals.length} exact-amount`}
              muted={plan.approvals.length === 0}
            />
          </div>
          {plan.estimates.incomplete ? (
            <p className="mt-2 text-[0.75rem] leading-relaxed text-ink-muted">
              Some figures could not be established. ZeFi shows them as unavailable rather than estimating
              a number it cannot source.
            </p>
          ) : null}
        </section>

        {/* ── Simulation ───────────────────────────────────────────────── */}
        <section aria-labelledby={`${plan.id}-simulation`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id={`${plan.id}-simulation`} className="label-tech text-ink-soft">
              Simulation
            </h3>
            <span className={plan.simulation.deepSimulation ? 'chip chip-positive' : 'chip'}>
              {plan.simulation.deepSimulation
                ? `Deep · ${plan.simulation.provider}`
                : `Local validation · ${plan.simulation.provider}`}
            </span>
          </div>

          <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-soft">
            {describeSimulation(plan.simulation)}
          </p>

          {plan.simulation.checks.length > 0 ? (
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line">
              {plan.simulation.checks.map((check) => (
                <li key={check.id} className="flex items-start gap-3 bg-ivory/50 px-3.5 py-2.5">
                  <CheckIcon outcome={check.outcome} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.8125rem] leading-snug font-medium text-ink">{check.label}</p>
                    <p className="num mt-0.5 text-[0.6875rem] leading-snug text-ink-muted [overflow-wrap:anywhere]">{check.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        {/* ── Risk ─────────────────────────────────────────────────────── */}
        {plan.risks.length > 0 ? (
          <section aria-labelledby={`${plan.id}-risks`}>
            <h3 id={`${plan.id}-risks`} className="label-tech text-ink-soft">
              Risk review
            </h3>
            <ul className="mt-3 space-y-2">
              {plan.risks.map((risk) => (
                <li
                  key={risk.code + risk.title}
                  className={cn(
                    'rounded-xl border p-3.5',
                    risk.severity === 'critical'
                      ? 'border-critical/20 bg-critical-soft/60'
                      : risk.severity === 'caution'
                        ? 'border-caution/20 bg-caution-soft/60'
                        : 'border-line bg-ivory/60',
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[0.875rem] font-medium text-ink">{risk.title}</p>
                    <SeverityBadge severity={risk.severity} />
                  </div>
                  <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-soft">{risk.detail}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* ── Provenance ───────────────────────────────────────────────── */}
        <section aria-labelledby={`${plan.id}-sources`}>
          <h3 id={`${plan.id}-sources`} className="label-tech text-ink-soft">
            Where these figures came from
          </h3>
          <ul className="mt-3 space-y-1.5">
            {plan.dataSources.map((source) => (
              <li
                key={source.label + source.retrievedAt}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-b border-line pb-1.5 last:border-0"
              >
                <span className="text-[0.8125rem] text-ink-soft">
                  {source.label}
                  {source.detail ? <span className="text-ink-muted"> — {source.detail}</span> : null}
                </span>
                <span className="num text-[0.6875rem] whitespace-nowrap text-ink-muted">
                  {source.kind} · {formatDateTime(source.retrievedAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {plan.missingInformation.length > 0 || plan.blockers.length > 0 ? (
          <div className="rounded-xl border border-caution/25 bg-caution-soft/60 p-4">
            <p className="label-tech-sm text-caution">Before this can proceed</p>
            <ul className="mt-2 space-y-1.5">
              {plan.missingInformation.map((field) => (
                <li key={field} className="text-[0.8125rem] text-ink-soft">
                  Missing: <span className="num">{field}</span>
                </li>
              ))}
              {plan.blockers.map((blocker) => (
                <li key={blocker} className="text-[0.8125rem] leading-relaxed text-ink-soft">
                  {blocker}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {/* ── Confirmation ───────────────────────────────────────────────── */}
      <footer className="border-t border-line bg-ivory/70 px-5 py-4 sm:px-6">
        {footer ?? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[0.8125rem] text-ink-soft">
              Every plan requires explicit approval. Your wallet signs; ZeFi never holds funds.
            </p>
            <span className="chip">{plan.confirmationLabel}</span>
          </div>
        )}
      </footer>
    </article>
  )
}

function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-ivory/60 p-4">
      <p className="label-tech-sm text-ink-muted">{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  )
}

function MicroRow({
  label,
  value,
  href,
  mono = false,
}: {
  label: string
  value: string
  href?: string | null
  mono?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="label-tech-sm text-ink-muted">{label}</dt>
      <dd className={cn('text-[0.8125rem] text-ink', mono && 'num')}>
        {href ? (
          <a href={href} target="_blank" rel="noreferrer noopener" className="link-underline">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  )
}

function Stat({
  label,
  value,
  sub,
  muted = false,
}: {
  label: string
  value: string
  sub?: string | undefined
  muted?: boolean
}) {
  return (
    <div className="bg-white p-4">
      <p className="label-tech-sm text-ink-muted">{label}</p>
      <p className={cn('num mt-1.5 text-[0.9375rem]', muted ? 'text-ink-faint' : 'text-ink')}>{value}</p>
      {sub ? <p className="num mt-0.5 text-[0.6875rem] text-ink-muted">{sub}</p> : null}
    </div>
  )
}

function CheckIcon({ outcome }: { outcome: SimulationCheck['outcome'] }) {
  const map = {
    pass: { Icon: Check, cls: 'text-positive bg-positive-soft' },
    warn: { Icon: AlertTriangle, cls: 'text-caution bg-caution-soft' },
    fail: { Icon: X, cls: 'text-critical bg-critical-soft' },
    skipped: { Icon: CircleDashed, cls: 'text-ink-faint bg-sand/60' },
  } as const
  const { Icon, cls } = map[outcome]
  return (
    <span className={cn('mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full', cls)}>
      <Icon className="h-2.5 w-2.5" aria-hidden="true" />
      <span className="sr-only">{outcome}</span>
    </span>
  )
}

export function PlanDisclaimer() {
  return (
    <p className="flex gap-2 text-[0.75rem] leading-relaxed text-ink-muted">
      <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
      ZeFi provides informational, technical, and transaction-planning tools. Outputs may contain
      incomplete assumptions and do not constitute financial, investment, legal, tax, compliance, or
      security-audit advice.
    </p>
  )
}
