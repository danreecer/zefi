import { SectionHeader } from '@/components/marketing/section-header'

/**
 * FUTURE AGENTIC EXECUTION.
 *
 * Presented as a roadmap and labelled as one. Nothing in this section is
 * described in the present tense, and the section header says plainly that none
 * of it is live.
 */

export const POLICY_EXAMPLES = [
  'Never move more than 1,000 USDC in a day',
  'Only interact with an approved contract list',
  'Never sign an unlimited token approval',
  'Keep at least 0.05 ETH available for gas',
  'Rebalance only when an allocation drifts past a set threshold',
  'Require manual approval above a specified value',
  'Pause execution when simulation confidence is low',
] as const

export const MECHANISMS = [
  {
    title: 'Smart accounts',
    body: 'Policy enforced at the account, not in application code — so a bug in ZeFi cannot exceed the limits you set.',
  },
  {
    title: 'Session keys',
    body: 'Narrow, expiring authority scoped to specific contracts and methods, rather than a standing signature.',
  },
  {
    title: 'Spending limits',
    body: 'Per-transaction, daily and cumulative ceilings, checked before an agent is allowed to construct a call.',
  },
  {
    title: 'Approved-contract lists',
    body: 'An allowlist an agent cannot extend. Anything outside it escalates to a human.',
  },
  {
    title: 'Time limits',
    body: 'Authority that expires by default. A permission nobody revoked is not the same as a permission somebody wanted.',
  },
  {
    title: 'Revocable permissions',
    body: 'One action revokes everything, on-chain, without depending on ZeFi being reachable.',
  },
  {
    title: 'Simulation requirements',
    body: 'A policy can require a passing deep simulation before any autonomous action is submitted.',
  },
  {
    title: 'Human approval thresholds',
    body: 'Above a value or a risk score, the agent stops and asks. The default is to ask.',
  },
] as const

export function AgenticSection() {
  return (
    <section className="section relative overflow-hidden" id="agentic">
      <div className="shell">
        <SectionHeader
          eyebrow="Coming next — not yet available"
          title={
            <>
              Agentic finance,
              <br />
              bounded by policy
            </>
          }
          lede="ZeFi is not an autonomous system today, and this section describes work that has not shipped. The direction matters, though, because it determines what is worth building now: an execution layer is only useful if the constraints around it are real."
        />

        <div className="mt-12 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:gap-8">
          <div className="panel-solid p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="label-tech text-ink-soft">Policies a user would write</h3>
              <span className="chip chip-caution">Planned</span>
            </div>
            <ul className="mt-5 space-y-3">
              {POLICY_EXAMPLES.map((policy, index) => (
                <li key={policy} className="flex gap-3">
                  <span className="num mt-px text-[0.6875rem] text-ember-700">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[0.9375rem] leading-snug text-ink-soft">{policy}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 border-t border-line pt-4 text-[0.8125rem] leading-relaxed text-ink-muted">
              A policy is only meaningful if something other than the agent enforces it. That is why this
              work depends on smart accounts rather than on ZeFi promising to behave.
            </p>
          </div>

          <div>
            <ul className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
              {MECHANISMS.map((mechanism) => (
                <li key={mechanism.title} className="bg-white p-5">
                  <h3 className="text-[0.9375rem] font-medium text-ink">{mechanism.title}</h3>
                  <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-soft">{mechanism.body}</p>
                </li>
              ))}
            </ul>

          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <AvailabilityCard
            tone="positive"
            title="Available now"
            items={[
              'AI crypto assistant',
              'Wallet overview and portfolio explanation',
              'Natural-language transaction planning',
              'Transaction previews and local simulation',
              'Risk and fee summaries',
              'Persistent conversations',
              'Routefold product access',
            ]}
          />
          <AvailabilityCard
            tone="caution"
            title="Coming next"
            items={[
              'Swap and bridge execution',
              'Smart-account permissions',
              'Policy-controlled autonomous agents',
              'Scheduled onchain actions',
              'Conditional transaction execution',
            ]}
          />
        </div>
      </div>
    </section>
  )
}

function AvailabilityCard({
  tone,
  title,
  items,
}: {
  tone: 'positive' | 'caution'
  title: string
  items: readonly string[]
}) {
  return (
    <div className="panel-quiet p-5">
      <span className={tone === 'positive' ? 'chip chip-positive' : 'chip chip-caution'}>{title}</span>
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5 text-[0.8125rem] leading-snug text-ink-soft">
            <span
              aria-hidden="true"
              className={`mt-[0.5em] h-1 w-1 shrink-0 rounded-full ${
                tone === 'positive' ? 'bg-positive' : 'bg-caution'
              }`}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
