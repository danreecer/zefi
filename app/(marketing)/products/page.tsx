import { ArrowUpRight } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { RoutefoldMark } from '@/components/brand/routefold-mark'
import { ZefiMark } from '@/components/brand/zefi-mark'
import { PageHero } from '@/components/marketing/page-hero'
import { SectionHeader } from '@/components/marketing/section-header'
import { publicConfig } from '@/lib/config/public'

export const metadata: Metadata = {
  title: 'Products',
  description:
    'ZeFi Intelligence, Routefold, and the execution layer ZeFi is building between human intent and onchain finance.',
  alternates: { canonical: '/products' },
}

const FUTURE = [
  {
    name: 'ZeFi Actions',
    body: 'Swap, bridge and protocol interactions built from live route quotes, presented for approval as a single reviewable plan.',
    depends: 'Requires a swap and bridge routing provider.',
  },
  {
    name: 'ZeFi Agents',
    body: 'Policy-bounded automation on smart accounts: spending limits, approved-contract lists, expiring session keys, revocable at any time.',
    depends: 'Requires smart-account infrastructure and deep simulation.',
  },
  {
    name: 'ZeFi Guard',
    body: 'Pre-signature analysis of transactions a user brings from elsewhere — decoding calldata, flagging unlimited approvals, naming the counterparty.',
    depends: 'Requires a contract-metadata and simulation provider.',
  },
] as const

export default function ProductsPage() {
  return (
    <>
      <PageHero
        eyebrow="Products"
        title={
          <>
            Two products,
            <br />
            one architecture
          </>
        }
        lede="ZeFi builds the interface between human intent and onchain finance. Today that is an intelligence layer for individuals and an expansion-intelligence platform for the teams building what they use."
      />

      <section className="section">
        <div className="shell space-y-4">
          {/* ── ZeFi Intelligence ────────────────────────────────────── */}
          <article className="panel-solid grid gap-8 p-6 sm:p-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
            <div>
              <div className="flex items-center gap-2.5">
                <ZefiMark className="h-6 w-6" />
                <span className="font-display text-[1.0625rem] font-medium text-ink">
                  ZeFi Intelligence
                </span>
                <span className="chip chip-positive">Available now</span>
              </div>
              <h2 className="display-lg mt-6 text-ink">Ask crypto anything, then act on it safely</h2>
              <p className="lede mt-4">
                The conversational assistant and intent engine. It explains, reads your wallet, and turns
                natural language into a structured plan that a deterministic layer validates before you
                are ever asked to sign.
              </p>
              <div className="mt-7 flex flex-wrap gap-2.5">
                <Link href="/app" prefetch={false} className="btn btn-primary">
                  Launch ZeFi
                </Link>
                <Link href="/intelligence" className="btn btn-ghost">
                  How it works
                </Link>
              </div>
            </div>

            <ul className="grid gap-px self-start overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
              {[
                ['Explanations', 'Protocols, contracts, mechanics'],
                ['Wallet reads', 'Balances across five EVM networks'],
                ['Intent parsing', 'Ten typed intent categories'],
                ['Transaction plans', 'Actions, fees, approvals, risk'],
                ['Local simulation', 'Eight deterministic checks'],
                ['Transfers', 'Native and ERC-20, user-signed'],
              ].map(([title, body]) => (
                <li key={title} className="bg-white p-4">
                  <p className="text-[0.875rem] font-medium text-ink">{title}</p>
                  <p className="mt-1 text-[0.75rem] leading-snug text-ink-muted">{body}</p>
                </li>
              ))}
            </ul>
          </article>

          {/* ── Routefold ────────────────────────────────────────────── */}
          <article className="relative grid gap-8 overflow-hidden rounded-[24px] bg-midnight p-6 text-ivory sm:p-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  'radial-gradient(56% 70% at 92% 4%, rgba(255,111,34,0.26) 0%, rgba(255,111,34,0) 62%)',
              }}
            />
            <div className="relative">
              <div className="flex items-center gap-2.5">
                <RoutefoldMark className="h-6 w-6" tone="ivory" />
                <span className="font-display text-[1.0625rem] font-medium text-ivory">Routefold</span>
                <span className="chip border-white/15 bg-white/8 text-ivory/70">A ZeFi company</span>
              </div>
              <h2 className="display-lg mt-6 text-ivory">Model the next chain before you move</h2>
              <p className="mt-4 text-[1.0625rem] leading-relaxed text-ivory/70">
                Routefold is ZeFi’s multichain expansion-intelligence platform for protocols,
                applications, and onchain companies. It builds a Multichain Digital Twin of a product and
                turns it into a ranked expansion strategy.
              </p>
              <div className="mt-7 flex flex-wrap gap-2.5">
                <a
                  href={publicConfig.routefoldUrl}
                  {...(publicConfig.routefoldIsExternal
                    ? { target: '_blank', rel: 'noreferrer noopener' }
                    : {})}
                  className="btn btn-ember"
                >
                  Launch Routefold
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </a>
                <Link
                  href="/products/routefold"
                  className="btn border border-white/18 bg-white/8 text-ivory hover:bg-white/14"
                >
                  Product page
                </Link>
              </div>
            </div>

            <ul className="relative grid gap-px self-start overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2">
              {[
                ['Digital Twin', 'Structural model of the product'],
                ['Chain-fit score', 'Ranked against your architecture'],
                ['Expansion graph', 'Ordering and dependencies'],
                ['Architecture brief', 'What changes per chain'],
                ['Risk register', 'Named risks, owners, triggers'],
                ['30-day plan', 'Sequenced with checkpoints'],
              ].map(([title, body]) => (
                <li key={title} className="bg-midnight/90 p-4">
                  <p className="text-[0.875rem] font-medium text-ivory">{title}</p>
                  <p className="mt-1 text-[0.75rem] leading-snug text-ivory/50">{body}</p>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="section pt-0">
        <div className="shell">
          <SectionHeader
            eyebrow="Product directions"
            title="Where the execution layer goes"
            lede="Named so the direction is legible, and labelled so nobody mistakes a direction for a release. None of these are available today."
          />
          <ul className="mt-10 grid gap-4 md:grid-cols-3">
            {FUTURE.map((product) => (
              <li key={product.name} className="panel-quiet flex flex-col p-6">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-[1.0625rem] font-medium text-ink">{product.name}</h3>
                  <span className="chip chip-caution">Planned</span>
                </div>
                <p className="mt-3 flex-1 text-[0.875rem] leading-relaxed text-ink-soft">{product.body}</p>
                <p className="num mt-4 border-t border-line pt-3 text-[0.6875rem] leading-relaxed text-ink-muted">
                  {product.depends}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  )
}
