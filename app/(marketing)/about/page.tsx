import type { Metadata } from 'next'
import Link from 'next/link'

import { RoutefoldMark } from '@/components/brand/routefold-mark'
import { ZefiMark } from '@/components/brand/zefi-mark'
import { PageHero } from '@/components/marketing/page-hero'
import { SectionHeader } from '@/components/marketing/section-header'
import { FoundersSection } from '@/components/marketing/sections/founders'
import { publicConfig } from '@/lib/config/public'

export const metadata: Metadata = {
  title: 'Company',
  description:
    'ZeFi is an AI company building the interface between human intent and onchain finance, and the parent company behind Routefold.',
  alternates: { canonical: '/about' },
}

const ARGUMENT = [
  {
    heading: 'The problem is not that crypto is complicated',
    body: [
      'Plenty of complicated systems have usable interfaces. What makes onchain finance different is that the consequences of a small mistake are total and immediate. A mistyped address is not a validation error; it is a permanent loss. An unlimited approval is not a preference; it is a standing claim on your balance that outlives the transaction that created it.',
      'So the interface problem is really a verification problem. Users do not need fewer fields. They need something that checks the fields for them, and can explain what it checked.',
    ],
  },
  {
    heading: 'Why natural language alone is insufficient',
    body: [
      'A language model reads intent very well. Given “move two thousand dollars of USDC from Base to Solana, safest route”, it will correctly identify the action, the asset, the networks and the priority. That is a genuine advance over a form.',
      'What a model cannot be is the thing that decides an address is correct. Or that a token has six decimals rather than eighteen. Or that a balance covers an amount. Those questions have exact answers, and a system that answers them probabilistically will be right almost every time — which is precisely the failure mode that costs people money, because almost every time is indistinguishable from always until it is not.',
    ],
  },
  {
    heading: 'Why verification and simulation sit in the middle',
    body: [
      'ZeFi splits the work along the line where the two kinds of question actually divide. Interpretation is a language problem and gets a language model. Verification is an engineering problem and gets deterministic code: a curated registry, checksum validation, BigInt arithmetic, an explicit status machine.',
      'Between them sits an artefact — the transaction plan — that a person can read. It states what ZeFi understood, what it assumed, what it will do, what it will cost, what it cannot do, and where every number came from. The plan is the product. The chat is how you get one.',
    ],
  },
  {
    heading: 'Why Routefold belongs here',
    body: [
      'A team deciding which chain to expand to is doing route selection with worse information and higher stakes than an individual bridging stablecoins. The same discipline applies: build a structural model, score the options against it, name the risks, and produce something a person can act on.',
      'ZeFi collapses many possible routes into one verified action. Routefold takes one product and unfolds it into ranked destinations. Same company, same method, opposite direction of travel.',
    ],
  },
  {
    heading: 'The long-term view',
    body: [
      'Eventually a user should be able to set a policy — never more than a thousand a day, only these contracts, never an unlimited approval, always keep gas — and let bounded automation work inside it. That is a real product, and it is not this one yet.',
      'It depends on smart accounts, session keys and deep simulation, because a policy is only meaningful if something other than the agent enforces it. Building the execution layer first and the constraints afterwards is how you get an autonomous system nobody should use. We are doing it the other way round.',
    ],
  },
] as const

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="Company"
        title={
          <>
            An AI company
            <br />
            for onchain finance
          </>
        }
        lede="ZeFi builds artificial intelligence infrastructure for understanding, planning, simulating, and executing onchain financial activity — and sits between human intent and onchain execution."
        aside={
          <div className="panel p-5">
            <dl className="space-y-3">
              <div>
                <dt className="label-tech-sm text-ink-muted">Company</dt>
                <dd className="mt-1 text-[0.9375rem] text-ink">ZeFi</dd>
              </div>
              <div>
                <dt className="label-tech-sm text-ink-muted">Domain</dt>
                <dd className="num mt-1 text-[0.9375rem] text-ink">
                  {publicConfig.appUrl.replace(/^https?:\/\//, '')}
                </dd>
              </div>
              <div>
                <dt className="label-tech-sm text-ink-muted">Products</dt>
                <dd className="mt-1 text-[0.9375rem] text-ink">ZeFi Intelligence · Routefold</dd>
              </div>
              <div>
                <dt className="label-tech-sm text-ink-muted">Status</dt>
                <dd className="mt-1 text-[0.9375rem] text-ink">Live · publicly available</dd>
              </div>
            </dl>
          </div>
        }
      />

      <section className="section">
        <div className="shell">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-20">
            <div className="space-y-12">
              {ARGUMENT.map((part) => (
                <section key={part.heading}>
                  <h2 className="display-md text-ink">{part.heading}</h2>
                  <div className="mt-4 space-y-4">
                    {part.body.map((paragraph) => (
                      <p key={paragraph.slice(0, 40)} className="text-[1.0625rem] leading-relaxed text-ink-soft">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
              <div className="panel-solid p-6">
                <p className="label-tech-sm text-ink-muted">Brand architecture</p>
                <ul className="mt-4 space-y-4">
                  <li className="flex gap-3">
                    <ZefiMark className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <p className="text-[0.9375rem] font-medium text-ink">ZeFi</p>
                      <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-ink-soft">
                        The parent company and AI operating system for onchain finance.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <ZefiMark className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <p className="text-[0.9375rem] font-medium text-ink">ZeFi Intelligence</p>
                      <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-ink-soft">
                        The conversational assistant and intent-processing interface.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <RoutefoldMark className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <p className="text-[0.9375rem] font-medium text-ink">Routefold</p>
                      <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-ink-soft">
                        ZeFi’s multichain expansion-intelligence platform for protocols, applications,
                        and onchain companies.
                      </p>
                    </div>
                  </li>
                </ul>
                <Link href="/products" className="btn btn-ghost mt-5 w-full">
                  See the products
                </Link>
              </div>

              <div className="panel-quiet p-6">
                <p className="label-tech-sm text-ink-muted">On the .AE domain</p>
                <p className="mt-3 text-[0.875rem] leading-relaxed text-ink-soft">
                  ZeFi operates at <span className="num text-ink">zefi.ae</span>. A country-code domain
                  is an address, not a licence. ZeFi makes no claim to any regulatory registration,
                  authorisation or supervised status in the UAE or anywhere else, and nothing on this
                  site should be read as implying one.
                </p>
              </div>

              <div className="panel-quiet p-6">
                <p className="label-tech-sm text-ink-muted">What this page does not contain</p>
                <p className="mt-3 text-[0.875rem] leading-relaxed text-ink-soft">
                  No investor logos, no customer count, no transaction volume, no partnership
                  announcements. ZeFi publishes those things when they are true, and not before.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <FoundersSection className="pt-0" />

      <section className="section pt-0">
        <div className="shell">
          <SectionHeader eyebrow="Language" title="How ZeFi talks about itself" />
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <div className="panel-quiet p-6">
              <span className="chip chip-positive">Uses</span>
              <ul className="mt-4 space-y-2">
                {[
                  'Ask. Plan. Execute onchain.',
                  'From intent to execution.',
                  'Understand before you sign.',
                  'Every action, explained.',
                  'Every route, verified.',
                  'Your wallet remains in control.',
                  'Intelligence before execution.',
                  'Human intent. Machine planning. User approval.',
                  'Routefold — A ZeFi company.',
                ].map((phrase) => (
                  <li key={phrase} className="text-[0.9375rem] text-ink-soft">
                    {phrase}
                  </li>
                ))}
              </ul>
            </div>
            <div className="panel-quiet p-6">
              <span className="chip chip-critical">Never</span>
              <ul className="mt-4 space-y-2">
                {[
                  'Revolutionary, game-changing, supercharge',
                  'Seamless, effortless, ultimate',
                  'Guaranteed returns, risk-free execution',
                  'Autonomous money',
                  'AI-powered everything',
                ].map((phrase) => (
                  <li key={phrase} className="text-[0.9375rem] text-ink-faint line-through">
                    {phrase}
                  </li>
                ))}
              </ul>
              <p className="mt-5 border-t border-line pt-4 text-[0.8125rem] leading-relaxed text-ink-muted">
                Not a style preference. Each of those words asks a reader to skip a question they should
                be asking.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
