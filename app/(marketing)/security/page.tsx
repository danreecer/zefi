import type { Metadata } from 'next'

import { PageHero } from '@/components/marketing/page-hero'
import { SectionHeader } from '@/components/marketing/section-header'
import { SAFETY_PILLARS } from '@/components/marketing/sections/safety'

export const metadata: Metadata = {
  title: 'Security',
  description:
    'ZeFi never requests or stores seed phrases or private keys. Connected wallets retain custody and sign transactions directly.',
  alternates: { canonical: '/security' },
}

const CONTROLS = [
  {
    group: 'Custody',
    items: [
      'No private key or seed phrase is ever requested, transmitted, or stored',
      'No server-side wallet client exists in the codebase — signing has no server path',
      'ZeFi is not a custodian and holds no user funds at any point',
      'Every transaction is signed in the user’s own wallet, in their own browser',
    ],
  },
  {
    group: 'Transaction integrity',
    items: [
      'Contract addresses, decimals and chain ids come from a curated registry, never from a model',
      'Recipient addresses are EIP-55 checksummed and screened for burn addresses and self-transfers',
      'Amounts are validated as decimal strings and converted with BigInt — never through a float',
      'Approvals are planned exact-amount; an unlimited allowance is never presented for signature',
      'Duplicate submission is prevented by two independent uniqueness constraints plus an idempotency key',
    ],
  },
  {
    group: 'Authorisation',
    items: [
      'All /app routes and mutating API routes are protected by middleware',
      'Every user-owned query is scoped by the authenticated user’s id — no lookup by primary key alone',
      '“Not found” and “belongs to someone else” return the same response, because the difference is information',
      'Clerk secret keys are server-only and never reach a browser bundle',
    ],
  },
  {
    group: 'AI boundaries',
    items: [
      'Model output is structurally incapable of becoming transaction data',
      'User text is sanitised of control characters and bidi overrides, then framed as untrusted data',
      'Structured output is obtained through a forced tool call and Zod-validated, with one repair attempt',
      'Requests carry explicit timeouts; a failed provider produces an error, never a fixture',
      'System prompts live in server-only files and are never shipped to a client',
    ],
  },
  {
    group: 'Transport and platform',
    items: [
      'Content-Security-Policy with object-src none, base-uri self and frame-ancestors none',
      'HSTS with preload, nosniff, strict-origin-when-cross-origin, and a restrictive Permissions-Policy',
      'Rate limiting on the assistant surface, per minute and per day',
      'Server-side action logs for every mutation, scoped to the acting user',
    ],
  },
] as const

const HONEST_LIMITS = [
  {
    title: 'The default rate limiter is per-instance',
    body: 'An in-memory limiter means the effective ceiling on a serverless platform is the configured limit multiplied by the number of live instances. Set UPSTASH_REDIS_REST_URL for a shared limiter when you need a hard guarantee.',
  },
  {
    title: 'The CSP permits inline scripts',
    body: 'Next.js emits an inline bootstrap script for every statically rendered route. A nonce-based policy would force dynamic rendering across the marketing site. The high-value directives are enforced strictly; script-src is the documented compromise.',
  },
  {
    title: 'Deep simulation is not configured by default',
    body: 'Local deterministic validation always runs. Without a simulation provider, ZeFi has not executed the transaction against chain state — and says so on every plan rather than implying coverage it does not have.',
  },
  {
    title: 'ZeFi has not been independently audited',
    body: 'No third-party security audit has been performed on this codebase. Anyone evaluating ZeFi for material value should treat that as a live consideration rather than a formality.',
  },
] as const

export default function SecurityPage() {
  return (
    <>
      <PageHero
        eyebrow="Security"
        title={
          <>
            Your wallet
            <br />
            remains in control
          </>
        }
        lede="ZeFi never requests or stores seed phrases or private keys. Connected wallets retain custody and sign transactions directly."
        aside={
          <div className="panel p-5">
            <p className="label-tech-sm text-ink-muted">Disclosure</p>
            <p className="mt-3 text-[0.875rem] leading-relaxed text-ink-soft">
              Report a vulnerability to{' '}
              <span className="num text-ink">security@zefi.ae</span>. Please include reproduction steps
              and give a reasonable window before public disclosure.
            </p>
          </div>
        }
      />

      <section className="section">
        <div className="shell">
          <ul className="grid gap-4 md:grid-cols-2">
            {SAFETY_PILLARS.map((pillar) => (
              <li key={pillar.title} className="panel-solid flex flex-col p-6">
                <span className="grid h-9 w-9 place-items-center rounded-full border border-line bg-ember-50">
                  <pillar.icon className="h-4 w-4 text-ember-700" aria-hidden="true" />
                </span>
                <h2 className="display-md mt-4 text-ink">{pillar.title}</h2>
                <p className="mt-3 flex-1 text-[0.9375rem] leading-relaxed text-ink-soft">{pillar.body}</p>
                <p className="num mt-5 border-t border-line pt-4 text-[0.6875rem] leading-relaxed text-ember-700">
                  {pillar.line}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section pt-0">
        <div className="shell">
          <SectionHeader eyebrow="Controls" title="What is actually implemented" />
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {CONTROLS.map((control) => (
              <section key={control.group} className="panel-quiet p-6">
                <h3 className="label-tech text-ember-700">{control.group}</h3>
                <ul className="mt-4 space-y-2.5">
                  {control.items.map((item) => (
                    <li key={item} className="flex gap-2.5 text-[0.875rem] leading-relaxed text-ink-soft">
                      <span
                        aria-hidden="true"
                        className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-ember-600"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </section>

      <section className="section pt-0">
        <div className="shell">
          <SectionHeader
            eyebrow="Known limits"
            title="What ZeFi does not claim"
            lede="A security page that lists only strengths is a marketing page. These are the trade-offs a reviewer would find anyway."
          />
          <ul className="mt-10 grid gap-4 md:grid-cols-2">
            {HONEST_LIMITS.map((limit) => (
              <li key={limit.title} className="rounded-2xl border border-caution/25 bg-caution-soft/50 p-6">
                <h3 className="text-[1rem] font-medium text-ink">{limit.title}</h3>
                <p className="mt-2.5 text-[0.875rem] leading-relaxed text-ink-soft">{limit.body}</p>
              </li>
            ))}
          </ul>

          <div className="panel-solid mt-6 p-6">
            <h3 className="label-tech text-ink-soft">Disclaimer</h3>
            <p className="mt-3 max-w-4xl text-[0.9375rem] leading-relaxed text-ink-soft">
              ZeFi provides informational, technical, and transaction-planning tools. Outputs may contain
              incomplete assumptions and do not constitute financial, investment, legal, tax, compliance,
              or security-audit advice.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
