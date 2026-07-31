import type { Metadata } from 'next'

import { PageHero } from '@/components/marketing/page-hero'
import { SectionHeader } from '@/components/marketing/section-header'
import { IntentToExecution } from '@/components/marketing/sections/intent-to-execution'
import { PlanCard, PlanDisclaimer } from '@/components/plan/plan-card'
import { HERO_PLAN, TRANSFER_PLAN } from '@/lib/demo/fixtures'

export const metadata: Metadata = {
  title: 'How it works',
  description:
    'What ZeFi does today, what needs a provider, and exactly how a sentence becomes a signed transaction.',
  alternates: { canonical: '/how-it-works' },
}

const MATRIX = [
  { capability: 'Explain crypto concepts and contract behaviour', status: 'live', note: 'Requires OPENAI_API_KEY and OPENAI_MODEL (or the Anthropic pair).' },
  { capability: 'Read native and ERC-20 balances', status: 'live', note: 'Five EVM networks, via configured RPC endpoints.' },
  { capability: 'Parse natural language into a typed intent', status: 'live', note: 'Ten intent categories, Zod-validated.' },
  { capability: 'Build a transaction plan with risk and approvals', status: 'live', note: 'Fully deterministic; no model input.' },
  { capability: 'Local deterministic validation', status: 'live', note: 'Eight checks. Runs with no provider configured.' },
  { capability: 'Native-currency transfers', status: 'live', note: 'User-signed. Gated by TRANSACTION_EXECUTION_ENABLED.' },
  { capability: 'ERC-20 transfers', status: 'live', note: 'Registry tokens only. User-signed.' },
  { capability: 'Persistent conversations and plans', status: 'live', note: 'Requires DATABASE_URL; otherwise session-scoped and labelled.' },
  { capability: 'Deep simulation against live chain state', status: 'live', note: 'eth_call runs the contract before you sign. Needs SIMULATION_PROVIDER=rpc.' },
  { capability: 'Fork traces and full account diffs', status: 'provider', note: 'Needs a vendor adapter. eth_call catches reverts, not every balance change.' },
  { capability: 'Swap execution', status: 'provider', note: 'Needs SWAP_PROVIDER. ZeFi plans the steps but builds no calldata.' },
  { capability: 'Bridge execution', status: 'provider', note: 'Needs BRIDGE_PROVIDER. ZeFi plans the steps but builds no calldata.' },
  { capability: 'USD-denominated amounts on volatile assets', status: 'provider', note: 'Needs PORTFOLIO_PROVIDER for pricing. ZeFi will not estimate a price.' },
  { capability: 'Scheduled or conditional execution', status: 'planned', note: 'Not built.' },
  { capability: 'Policy-bounded autonomous agents', status: 'planned', note: 'Not built. Depends on smart accounts.' },
  { capability: 'Solana transactions', status: 'planned', note: 'Recognised for planning; no Solana wallet connection.' },
] as const

const STATUS_META = {
  live: { chip: 'chip chip-positive', label: 'Available now' },
  provider: { chip: 'chip chip-caution', label: 'Provider required' },
  planned: { chip: 'chip', label: 'Not built' },
} as const

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        eyebrow="How it works"
        title={
          <>
            What runs today,
            <br />
            and what does not
          </>
        }
        lede="ZeFi is a product with a credible path, not a finished autonomous system. This page is the honest inventory: every capability, its real status, and what it depends on."
      />

      <IntentToExecution />

      {/* ── Capability matrix ────────────────────────────────────────── */}
      <section className="section" id="capabilities">
        <div className="shell">
          <SectionHeader
            eyebrow="Capability matrix"
            title="Nothing here is aspirational"
            lede="“Available now” means it works in a correctly configured deployment. “Provider required” means ZeFi builds and shows the plan but will not produce calldata. “Not built” means exactly that."
          />

          {/* Wide content scrolls inside its own container — never the page. */}
          <div className="mt-10 overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[34rem] border-collapse text-left">
              <caption className="sr-only">ZeFi capability status</caption>
              <thead>
                <tr className="bg-sand/50">
                  <th scope="col" className="label-tech-sm px-5 py-3 text-ink-muted">
                    Capability
                  </th>
                  <th scope="col" className="label-tech-sm px-5 py-3 text-ink-muted">
                    Status
                  </th>
                  <th scope="col" className="label-tech-sm hidden px-5 py-3 text-ink-muted md:table-cell">
                    Depends on
                  </th>
                </tr>
              </thead>
              <tbody>
                {MATRIX.map((row) => (
                  <tr key={row.capability} className="border-t border-line bg-white">
                    <th scope="row" className="px-5 py-3.5 text-[0.875rem] font-normal text-ink">
                      {row.capability}
                      <span className="mt-1 block text-[0.75rem] text-ink-muted md:hidden">{row.note}</span>
                    </th>
                    <td className="px-5 py-3.5">
                      <span className={STATUS_META[row.status].chip}>{STATUS_META[row.status].label}</span>
                    </td>
                    <td className="hidden px-5 py-3.5 text-[0.8125rem] text-ink-soft md:table-cell">
                      {row.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Two plans ────────────────────────────────────────────────── */}
      <section className="section pt-0" id="plan">
        <div className="shell">
          <SectionHeader
            eyebrow="Two plans, side by side"
            title="One ZeFi can sign. One it cannot."
            lede="The difference is visible in the interface itself. A plan ZeFi cannot execute is still built, still validated, and still explained — it simply never reaches a signature request."
          />

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="chip chip-positive">Executable today</span>
                <span className="text-[0.8125rem] text-ink-muted">ERC-20 transfer on Base</span>
              </div>
              <PlanCard plan={TRANSFER_PLAN} compact />
            </div>
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="chip chip-caution">Plan-only</span>
                <span className="text-[0.8125rem] text-ink-muted">Cross-VM bridge to Solana</span>
              </div>
              <PlanCard plan={HERO_PLAN} compact />
            </div>
          </div>

          <div className="mt-8">
            <PlanDisclaimer />
          </div>
        </div>
      </section>
    </>
  )
}
