import { PlanCard, PlanDisclaimer } from '@/components/plan/plan-card'
import { SectionHeader } from '@/components/marketing/section-header'
import { AmbientField } from '@/components/marketing/ambient-field'
import { TRANSFER_PLAN } from '@/lib/demo/fixtures'

export function PlanDemoSection() {
  return (
    <section className="section relative overflow-hidden" id="transaction-plan">
      <AmbientField variant="soft" className="-z-10" />

      <div className="shell">
        <SectionHeader
          eyebrow="Transaction plan"
          title={
            <>
              Understand before
              <br />
              you sign
            </>
          }
          lede="This is the plan interface itself, not a picture of it. The same component renders inside the application — same fields, same statuses, same account of what ZeFi cannot do."
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
          <PlanCard plan={TRANSFER_PLAN} />

          <aside className="space-y-4 lg:sticky lg:top-8">
            <div className="panel-quiet p-5">
              <h3 className="display-md text-ink">What a plan must always contain</h3>
              <ul className="mt-4 space-y-2.5">
                {[
                  'Your original request, stored verbatim',
                  'ZeFi’s interpretation, and its confidence in it',
                  'Every assumption it had to make',
                  'The ordered sequence of actions',
                  'Which steps your wallet signs, and which need a provider',
                  'Contract addresses, recipients and function signatures',
                  'Fees, slippage and timing — or an honest blank',
                  'Required approvals, always exact-amount',
                  'Simulation outcome, and which provider produced it',
                  'Where every number came from, and when',
                ].map((item) => (
                  <li key={item} className="flex gap-2.5 text-[0.875rem] leading-snug text-ink-soft">
                    <span
                      aria-hidden="true"
                      className="mt-[0.5em] h-1 w-1 shrink-0 rounded-full bg-ember-600"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="panel-quiet p-5">
              <h3 className="label-tech text-ink-soft">The confirm control</h3>
              <p className="mt-3 text-[0.875rem] leading-relaxed text-ink-soft">
                ZeFi labels the button with the action it performs. There is no “execute instantly”,
                because nothing about signing a transaction is instant, and nothing about it should be
                unconsidered.
              </p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="chip chip-positive">Uses</span>
                  <span className="num text-[0.8125rem] text-ink">Review 250 USDC transfer</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="chip chip-critical">Never</span>
                  <span className="num text-[0.8125rem] text-ink-faint line-through">Execute instantly</span>
                </div>
              </div>
            </div>

            <PlanDisclaimer />
          </aside>
        </div>
      </div>
    </section>
  )
}
