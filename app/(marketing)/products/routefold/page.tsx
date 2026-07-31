import { ArrowUpRight } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { RoutefoldMark } from '@/components/brand/routefold-mark'
import { ZefiLogo } from '@/components/brand/zefi-mark'
import { AmbientField } from '@/components/marketing/ambient-field'
import { SectionHeader } from '@/components/marketing/section-header'
import { SiteHeader } from '@/components/marketing/site-header'
import {
  ROUTEFOLD_CANDIDATES,
  ROUTEFOLD_DELIVERABLES,
} from '@/components/marketing/sections/routefold'
import { publicConfig } from '@/lib/config/public'

export const metadata: Metadata = {
  title: 'Routefold — A ZeFi company',
  description:
    'Routefold is ZeFi’s multichain expansion-intelligence platform for protocols, applications, and onchain companies. Model the next chain before you move.',
  alternates: { canonical: '/products/routefold' },
}

/**
 * The Routefold product page.
 *
 * Routefold keeps its own identity here — a dark, dense, technical surface — but
 * the typography, node vocabulary, hairlines and ember accent are ZeFi's. The
 * ZeFi navigation stays at the top, because Routefold is a product of a company,
 * not a separate universe.
 */

const TWIN_LAYERS = [
  { name: 'Contract surface', detail: 'Every deployed contract, its upgrade path, and what assumes a single chain.' },
  { name: 'Liquidity dependencies', detail: 'Which pools, which depth, and what happens when it is a tenth of that.' },
  { name: 'Oracle surface', detail: 'Price sources per chain, their update cadence, and their failure behaviour.' },
  { name: 'Sequencer assumptions', detail: 'What the product implicitly assumes about ordering, finality and reorgs.' },
  { name: 'Key management', detail: 'Admin keys, multisigs, timelocks — and what replicating them costs per chain.' },
  { name: 'Distribution', detail: 'Where the users are, where the integrations are, and where neither is yet.' },
] as const

const PHASES = [
  { week: 'Days 1–7', title: 'Twin and baseline', detail: 'Build the digital twin, agree the scoring weights, and freeze the candidate set.' },
  { week: 'Days 8–14', title: 'Architecture brief', detail: 'Per-chain deltas: bridging model, oracle sourcing, key management, monitoring.' },
  { week: 'Days 15–21', title: 'Risk register and dry run', detail: 'Named risks with owners and triggers; testnet deployment against the brief.' },
  { week: 'Days 22–30', title: 'Launch sequence', detail: 'Ordered rollout with checkpoints, liquidity plan, and a documented rollback.' },
] as const

export default function RoutefoldPage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative isolate px-3 pt-3 pb-4 sm:px-5 sm:pt-5 lg:px-7 lg:pt-6">
        <AmbientField variant="hero" className="-z-10 rounded-[32px]" />

        <div className="zefi-frame mx-auto w-full max-w-[96rem] overflow-hidden px-4 py-4 sm:px-7 sm:py-6 lg:px-10 lg:py-7">
          <SiteHeader />

          <div className="relative mt-6 overflow-hidden rounded-[24px] bg-midnight text-ivory">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  'radial-gradient(54% 66% at 90% 6%, rgba(255,111,34,0.32) 0%, rgba(255,111,34,0) 62%), radial-gradient(48% 54% at 2% 98%, rgba(255,154,61,0.14) 0%, rgba(255,154,61,0) 60%)',
              }}
            />

            <div className="relative px-6 py-14 sm:px-10 sm:py-16 lg:px-14 lg:py-20">
              <div className="flex flex-wrap items-center gap-3">
                <RoutefoldMark className="h-8 w-8" tone="ivory" />
                <span className="font-display text-xl font-medium tracking-[-0.02em] text-ivory">
                  Routefold
                </span>
                <span className="chip border-white/15 bg-white/8 text-ivory/70">A ZeFi company</span>
              </div>

              <h1 className="display-xl mt-10 max-w-4xl text-ivory">
                Model the next chain
                <br />
                before you move
              </h1>

              <p className="mt-7 max-w-2xl text-[1.0625rem] leading-relaxed text-ivory/70">
                Routefold creates a Multichain Digital Twin of an onchain product and turns it into a
                ranked expansion strategy, architecture brief, risk register, and 30-day execution plan.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-2.5">
                <a
                  href={publicConfig.routefoldUrl}
                  {...(publicConfig.routefoldIsExternal
                    ? { target: '_blank', rel: 'noreferrer noopener' }
                    : {})}
                  className="btn btn-ember btn-lg"
                >
                  Launch Routefold
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </a>
                <Link
                  href="/app/routefold"
                  className="btn btn-lg border border-white/18 bg-white/8 text-ivory hover:bg-white/14"
                >
                  Open in ZeFi
                </Link>
              </div>

              {/* Chain-fit preview */}
              <div className="mt-14 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-6">
                <div className="rounded-2xl border border-white/12 bg-white/6 p-6 backdrop-blur-xl">
                  <div className="flex items-center justify-between gap-3">
                    <span className="label-tech text-ivory/60">Chain-fit score</span>
                    <span className="chip border-white/15 bg-white/8 text-ivory/70">Illustrative</span>
                  </div>
                  <ul className="mt-6 space-y-5">
                    {ROUTEFOLD_CANDIDATES.map((candidate) => (
                      <li key={candidate.chain}>
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="flex items-baseline gap-2.5">
                            <span className="num text-[0.6875rem] text-ivory/40">
                              {String(candidate.rank).padStart(2, '0')}
                            </span>
                            <span className="text-[0.9375rem] font-medium text-ivory">
                              {candidate.chain}
                            </span>
                          </span>
                          <span className="num text-[0.875rem] text-ivory/80">{candidate.score}</span>
                        </div>
                        <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${candidate.score}%`,
                              background:
                                candidate.rank === 1
                                  ? 'linear-gradient(90deg,#FF9A3D,#ED4F08)'
                                  : 'rgba(255,255,255,0.32)',
                            }}
                          />
                        </div>
                        <p className="mt-1.5 text-[0.75rem] leading-snug text-ivory/45">{candidate.note}</p>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-white/12 bg-white/6 p-6 backdrop-blur-xl">
                  <span className="label-tech text-ivory/60">Expansion graph</span>
                  <ExpansionGraph />
                  <p className="mt-4 text-[0.75rem] leading-relaxed text-ivory/45">
                    Ordering matters as much as ranking. Some moves make the next one cheaper; some
                    foreclose it entirely.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Digital twin ─────────────────────────────────────────────── */}
      <section className="section">
        <div className="shell">
          <SectionHeader
            eyebrow="Multichain Digital Twin"
            title="A model of your product, not a chain leaderboard"
            lede="Generic chain rankings answer a question nobody asked. Routefold scores candidates against a structural model of the product that is actually moving — including the parts of it that do not travel."
          />
          <ul className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-2 lg:grid-cols-3">
            {TWIN_LAYERS.map((layer) => (
              <li key={layer.name} className="bg-white p-6">
                <h3 className="text-[0.9375rem] font-medium text-ink">{layer.name}</h3>
                <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-soft">{layer.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Deliverables ─────────────────────────────────────────────── */}
      <section className="section pt-0">
        <div className="shell">
          <SectionHeader eyebrow="What you receive" title="Six artefacts, not a slide deck" />
          <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ROUTEFOLD_DELIVERABLES.map((deliverable, index) => (
              <li key={deliverable.title} className="panel-solid p-6">
                <span className="num text-[0.6875rem] text-ember-700">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="display-md mt-2 text-ink">{deliverable.title}</h3>
                <p className="mt-2.5 text-[0.875rem] leading-relaxed text-ink-soft">{deliverable.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── 30-day plan ──────────────────────────────────────────────── */}
      <section className="section pt-0">
        <div className="shell">
          <SectionHeader eyebrow="30-day execution plan" title="Sequenced, with checkpoints" />
          <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {PHASES.map((phase) => (
              <li key={phase.week} className="panel-quiet p-5">
                <p className="label-tech-sm text-ember-700">{phase.week}</p>
                <h3 className="mt-3 text-[1rem] font-medium text-ink">{phase.title}</h3>
                <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-soft">{phase.detail}</p>
              </li>
            ))}
          </ol>

          <div className="panel-solid mt-6 flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <ZefiLogo className="text-[1rem]" />
              <span className="text-[0.875rem] text-ink-muted">builds</span>
              <RoutefoldMark className="h-5 w-5" />
              <span className="font-display text-[1rem] font-medium text-ink">Routefold</span>
            </div>
            <p className="max-w-md text-[0.8125rem] leading-relaxed text-ink-soft">
              Routefold — A ZeFi company. Same architecture, same safety posture, same refusal to
              present an estimate as a fact.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}

/** A small directed graph: three candidate chains, with ordering dependencies. */
function ExpansionGraph() {
  return (
    <svg viewBox="0 0 320 190" className="mt-5 w-full" fill="none" role="img" aria-label="Expansion graph showing Base first, then Arbitrum and Solana, then OP Mainnet">
      <defs>
        <linearGradient id="rf-edge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FF9A3D" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ED4F08" stopOpacity="0.5" />
        </linearGradient>
      </defs>

      <path d="M52 95C96 95 108 46 152 46" stroke="url(#rf-edge)" strokeWidth="1.5" />
      <path d="M52 95H152" stroke="url(#rf-edge)" strokeWidth="1.5" />
      <path d="M52 95C96 95 108 146 152 146" stroke="rgba(255,255,255,0.22)" strokeWidth="1.2" strokeDasharray="0.01 4" strokeLinecap="round" />
      <path d="M182 46C222 46 232 95 268 95" stroke="rgba(255,255,255,0.22)" strokeWidth="1.2" strokeDasharray="0.01 4" strokeLinecap="round" />

      <circle cx="46" cy="95" r="5" fill="#ED4F08" />
      <text x="46" y="116" textAnchor="middle" className="fill-ivory/70" style={{ font: '500 9px var(--font-mono)', letterSpacing: '0.1em' }}>
        BASE
      </text>

      <circle cx="164" cy="46" r="4" fill="#FF9A3D" />
      <text x="164" y="32" textAnchor="middle" className="fill-ivory/60" style={{ font: '500 9px var(--font-mono)', letterSpacing: '0.1em' }}>
        ARBITRUM
      </text>

      <circle cx="164" cy="146" r="4" fill="rgba(255,255,255,0.4)" />
      <text x="164" y="166" textAnchor="middle" className="fill-ivory/45" style={{ font: '500 9px var(--font-mono)', letterSpacing: '0.1em' }}>
        SOLANA
      </text>

      <circle cx="274" cy="95" r="4" fill="rgba(255,255,255,0.35)" />
      <text x="274" y="116" textAnchor="middle" className="fill-ivory/45" style={{ font: '500 9px var(--font-mono)', letterSpacing: '0.1em' }}>
        OP
      </text>
    </svg>
  )
}
