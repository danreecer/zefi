import Link from 'next/link'

import { SectionHeader } from '@/components/marketing/section-header'

export function MissionSection() {
  return (
    <section className="section" id="mission">
      <div className="shell">
        <SectionHeader
          eyebrow="Company mission"
          title={
            <>
              Human intent.
              <br />
              Machine planning.
              <br />
              User approval.
            </>
          }
        />

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16">
          <div className="space-y-5 text-[1.0625rem] leading-relaxed text-ink-soft">
            <p>
              Onchain finance has better rails than the system it is replacing and a worse interface than
              almost anything else people use. The knowledge required to act safely — which chain, which
              contract, which approval, which bridge, what it costs, what it risks — sits outside the
              tools, in the heads of people who have already made the mistakes.
            </p>
            <p>
              Natural language closes part of that gap and opens a new one. A model can read intent
              well. It cannot be the thing that decides an address is correct, that decimals are right,
              that a balance covers an amount, or that a route is safe. Those are deterministic
              questions, and answering them with a probability is how people lose money.
            </p>
            <p className="text-ink">
              So ZeFi puts the two together and keeps them apart. Interpretation is a language problem
              and we treat it as one. Verification is an engineering problem and we treat it as one. In
              between sits a plan a person can read, and a decision only a person can make.
            </p>
            <p>
              Routefold belongs in the same company because it is the same problem at a different scale:
              a team choosing which chain to expand to is doing route selection with worse information
              and higher stakes than a user bridging USDC. One product resolves many routes into one
              action; the other unfolds one product into ranked destinations.
            </p>
          </div>

          <div className="space-y-4">
            <div className="panel-solid p-6">
              <p className="label-tech-sm text-ink-muted">What ZeFi is</p>
              <p className="display-md mt-3 text-ink">
                An AI company building the interface between human intent and onchain finance.
              </p>
              <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-soft">
                ZeFi is registered at{' '}
                <span className="num text-ink">zefi.ae</span>. The domain is where the company operates —
                it does not imply a licence, a registration, or regulatory status of any kind, and ZeFi
                does not claim one.
              </p>
              <Link href="/about" className="btn btn-ghost mt-5">
                Read about the company
              </Link>
            </div>

            <div className="panel-quiet p-6">
              <p className="label-tech-sm text-ink-muted">Principles</p>
              <ul className="mt-4 space-y-3">
                {[
                  ['Intelligence before execution', 'Nothing is submitted that has not been explained.'],
                  ['Every action, explained', 'If ZeFi cannot say why, it does not proceed.'],
                  ['Every route, verified', 'Deterministic checks sit between a plan and a signature.'],
                  ['Your wallet remains in control', 'Custody never moves. Not once, not partially.'],
                ].map(([title, body]) => (
                  <li key={title}>
                    <p className="text-[0.9375rem] font-medium text-ink">{title}</p>
                    <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-ink-soft">{body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
