'use client'

import { motion } from 'framer-motion'
import { ArrowRight, ShieldAlert } from 'lucide-react'
import Link from 'next/link'

import { ZefiMark } from '@/components/brand/zefi-mark'
import { getChain } from '@/lib/chains/registry'
import { HERO_PLAN, HERO_PROMPT } from '@/lib/demo/fixtures'
import { formatDuration, formatUsd } from '@/lib/utils'

/**
 * The product preview embedded in the hero.
 *
 * This is the real plan object from `lib/demo/fixtures` rendered through the
 * real field names — same statuses, same honesty about what needs a provider.
 * It is labelled illustrative because the figures are fixed, not because the
 * structure is fake.
 */

const reveal = {
  hidden: { opacity: 0, y: 18 },
  show: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: 0.55 + index * 0.09, ease: [0.16, 1, 0.3, 1] as const },
  }),
}

export function HeroPreview() {
  const plan = HERO_PLAN
  const source = getChain(plan.intent.sourceNetwork)
  const destination = getChain(plan.intent.destinationNetwork)
  const mainRisk = plan.risks.find((risk) => risk.severity !== 'info') ?? plan.risks[0]

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.35fr)] lg:gap-4">
      {/* ── The prompt ─────────────────────────────────────────────────── */}
      <motion.div variants={reveal} custom={0} initial="hidden" animate="show" className="panel p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ZefiMark className="h-4 w-4" />
            <span className="label-tech text-ink-soft">ZeFi Intelligence</span>
          </div>
          <span className="chip chip-ember">Illustrative</span>
        </div>

        <p className="mt-5 font-display text-[1.0625rem] leading-[1.45] text-ink sm:text-lg">
          “{HERO_PROMPT}”
        </p>

        <div className="mt-5 rule" />

        <div className="mt-4 flex items-center justify-between">
          <span className="label-tech-sm text-ink-muted">Interpreted intent</span>
          <span className="num text-[0.6875rem] text-ink-muted">
            confidence {plan.intent.confidence.toFixed(2)}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="chip chip-ember">{plan.intentType}</span>
          <span className="chip">{source?.shortName ?? '—'}</span>
          <ArrowRight className="mt-1.5 h-3 w-3 shrink-0 text-ink-faint" aria-hidden="true" />
          <span className="chip">{destination?.shortName ?? '—'}</span>
        </div>

        <dl className="mt-4">
          <Row label="Asset" value={plan.intent.sourceAsset ?? '—'} />
          <Row label="Amount" value="2,000 (USD-denominated)" />
          <Row label="Priority" value={plan.intent.priority ?? '—'} />
        </dl>

        {plan.intent.clarifyingQuestion ? (
          <div className="mt-4 rounded-xl border border-line bg-ivory/70 p-3">
            <p className="label-tech-sm text-ink-muted">Still needed</p>
            <p className="mt-1.5 text-[0.8125rem] leading-snug text-ink-soft">
              {plan.intent.clarifyingQuestion}
            </p>
          </div>
        ) : null}

        <p className="mt-3 text-[0.6875rem] leading-snug text-ink-muted">
          ZeFi asks rather than assumes. A Base address is not valid on Solana, so it will not infer one.
        </p>
      </motion.div>

      {/* ── The plan ───────────────────────────────────────────────────── */}
      <motion.div variants={reveal} custom={1} initial="hidden" animate="show" className="panel p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="label-tech text-ink-soft">Transaction plan</span>
          <span className="chip chip-caution">Missing information</span>
        </div>

        {/* Route */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <ChainPill name={source?.shortName ?? 'Source'} />
          <RouteConnector />
          <span className="chip">Burn &amp; mint</span>
          <RouteConnector />
          <ChainPill name={destination?.shortName ?? 'Destination'} />
        </div>

        <dl className="mt-4">
          <Row
            label="Est. network cost"
            value={`${plan.estimates.networkCostNative} ${plan.estimates.networkCostSymbol} · ${formatUsd(plan.estimates.networkCostUsd)}`}
          />
          <Row
            label="Est. execution time"
            value={plan.estimates.estimatedSeconds ? formatDuration(plan.estimates.estimatedSeconds) : '—'}
          />
          <Row label="Steps" value={`${plan.actions.length} · 1 needs a provider`} />
          <Row label="Simulation" value="Local checks only" tone="caution" />
        </dl>

        {mainRisk ? (
          <div className="mt-4 flex gap-2.5 rounded-xl border border-caution/20 bg-caution-soft/70 p-3">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-caution" aria-hidden="true" />
            <div>
              <p className="label-tech-sm text-caution">Main risk</p>
              <p className="mt-1 text-[0.8125rem] leading-snug text-ink-soft">{mainRisk.title}</p>
            </div>
          </div>
        ) : null}

        <Link href="/how-it-works#plan" className="btn btn-primary mt-4 w-full">
          Review plan
        </Link>

        <p className="mt-2.5 text-center text-[0.6875rem] leading-snug text-ink-muted">
          Example figures. Nothing is submitted without your explicit approval and your wallet’s signature.
        </p>
      </motion.div>
    </div>
  )
}

function Row({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'caution'
}) {
  return (
    <div className="data-row">
      <dt className="data-key">{label}</dt>
      <dd className={tone === 'caution' ? 'data-val text-caution' : 'data-val'}>{value}</dd>
    </div>
  )
}

function ChainPill({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/85 px-2.5 py-1 text-[0.75rem] font-medium text-ink">
      {name}
    </span>
  )
}

function RouteConnector() {
  return (
    <svg width="18" height="8" viewBox="0 0 18 8" fill="none" aria-hidden="true" className="shrink-0">
      <path
        d="M0 4H14"
        stroke="currentColor"
        strokeWidth="1"
        className="text-ink-faint"
        strokeDasharray="0.01 3"
        strokeLinecap="round"
      />
      <path d="M13 1L17 4L13 7" stroke="currentColor" strokeWidth="1" className="text-ink-faint" fill="none" />
    </svg>
  )
}
