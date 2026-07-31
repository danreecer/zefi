import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

import { RoutefoldMark } from '@/components/brand/routefold-mark'
import { publicConfig } from '@/lib/config/public'

/**
 * ROUTEFOLD — the flagship product section.
 *
 * Given a dark plate of its own so it reads as a distinct product with its own
 * identity, while keeping ZeFi's typography, node vocabulary and orange accent.
 * Siblings, not twins.
 */

export const ROUTEFOLD_CANDIDATES = [
  { chain: 'Base', score: 91, note: 'Distribution depth, low fee floor, native USDC', rank: 1 },
  { chain: 'Arbitrum One', score: 84, note: 'Deepest DeFi liquidity, mature tooling', rank: 2 },
  { chain: 'Solana', score: 76, note: 'Highest throughput, non-EVM engineering cost', rank: 3 },
  { chain: 'OP Mainnet', score: 71, note: 'Superchain alignment, grant surface', rank: 4 },
] as const

export const ROUTEFOLD_DELIVERABLES = [
  {
    title: 'Multichain Digital Twin',
    body: 'A structural model of the product: contracts, dependencies, liquidity assumptions, oracle surface, and the parts that do not travel.',
  },
  {
    title: 'Chain-fit score',
    body: 'Each candidate scored against the twin — not against a generic leaderboard — so the ranking reflects your architecture.',
  },
  {
    title: 'Expansion graph',
    body: 'Ordering and dependencies across chains, including which moves foreclose others.',
  },
  {
    title: 'Architecture brief',
    body: 'What has to change per chain: bridging model, oracle sourcing, sequencer assumptions, key management.',
  },
  {
    title: 'Risk register',
    body: 'Named risks with owners and triggers, covering bridge trust, liquidity fragmentation, and governance surface.',
  },
  {
    title: '30-day execution plan',
    body: 'A sequenced plan with checkpoints, so the first two weeks are not spent deciding what the first two weeks are.',
  },
] as const

export function RoutefoldSection() {
  return (
    <section className="section relative" id="routefold">
      <div className="shell">
        <div className="relative overflow-hidden rounded-[28px] bg-midnight text-ivory">
          {/* Ember light bleeding into the dark plate — the family resemblance. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(58% 62% at 88% 8%, rgba(255,111,34,0.30) 0%, rgba(255,111,34,0) 62%), radial-gradient(46% 50% at 4% 96%, rgba(255,154,61,0.16) 0%, rgba(255,154,61,0) 60%)',
            }}
          />

          <div className="relative px-6 py-14 sm:px-10 sm:py-16 lg:px-14 lg:py-20">
            <div className="flex flex-wrap items-center gap-3">
              <RoutefoldMark className="h-7 w-7" tone="ivory" />
              <span className="font-display text-lg font-medium tracking-[-0.02em] text-ivory">
                Routefold
              </span>
              <span className="chip border-white/15 bg-white/8 text-ivory/70 backdrop-blur-none">
                A ZeFi company
              </span>
            </div>

            <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)] lg:gap-12">
              <div>
                <h2 className="display-lg text-ivory lg:text-[clamp(2.4rem,3.6vw,3.5rem)]">
                  Model the next chain
                  <br />
                  before you move
                </h2>
                <p className="mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-ivory/70">
                  Routefold creates a Multichain Digital Twin of an onchain product and turns it into a
                  ranked expansion strategy, architecture brief, risk register, and 30-day execution plan.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-2.5">
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
                    href="/products/routefold"
                    className="btn btn-lg border border-white/18 bg-white/8 text-ivory hover:bg-white/14"
                  >
                    Read the product page
                  </Link>
                </div>

                <p className="mt-8 max-w-xl text-[0.8125rem] leading-relaxed text-ivory/45">
                  Where ZeFi collapses many possible routes into one verified action, Routefold does the
                  inverse — it takes one product and unfolds it into ranked destinations. Same company,
                  opposite direction of travel.
                </p>
              </div>

              {/* ── Chain-fit preview ────────────────────────────────── */}
              <div className="rounded-2xl border border-white/12 bg-white/6 p-5 backdrop-blur-xl sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="label-tech text-ivory/60">Chain-fit score</span>
                  <span className="chip border-white/15 bg-white/8 text-ivory/70">Illustrative</span>
                </div>

                <ul className="mt-5 space-y-5">
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

                <p className="mt-6 border-t border-white/10 pt-4 text-[0.6875rem] leading-relaxed text-ivory/40">
                  Example scores for a hypothetical product. Real scores are produced against your own
                  Multichain Digital Twin.
                </p>
              </div>
            </div>

            {/* ── Deliverables ───────────────────────────────────────── */}
            <ul className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/8 sm:grid-cols-2 lg:grid-cols-3">
              {ROUTEFOLD_DELIVERABLES.map((deliverable) => (
                <li key={deliverable.title} className="bg-midnight/85 p-5">
                  <h3 className="text-[0.9375rem] font-medium text-ivory">{deliverable.title}</h3>
                  <p className="mt-2 text-[0.8125rem] leading-relaxed text-ivory/55">{deliverable.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
