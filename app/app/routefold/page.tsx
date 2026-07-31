import { ArrowUpRight } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { AppPageHeader, AppSection } from '@/components/app/page-header'
import { RoutefoldMark } from '@/components/brand/routefold-mark'
import {
  ROUTEFOLD_CANDIDATES,
  ROUTEFOLD_DELIVERABLES,
} from '@/components/marketing/sections/routefold'
import { publicConfig } from '@/lib/config/public'

export const metadata: Metadata = { title: 'Routefold' }

export default function AppRoutefoldPage() {
  const external = publicConfig.routefoldIsExternal

  return (
    <AppSection>
      <AppPageHeader
        title="Routefold"
        description="ZeFi’s multichain expansion-intelligence platform for protocols, applications, and onchain companies."
        action={
          <a
            href={publicConfig.routefoldUrl}
            {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
            className="btn btn-ember"
          >
            Launch Routefold
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </a>
        }
      />

      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section className="relative overflow-hidden rounded-2xl bg-midnight p-6 text-ivory sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(58% 66% at 90% 4%, rgba(255,111,34,0.28) 0%, rgba(255,111,34,0) 62%)',
            }}
          />
          <div className="relative">
            <div className="flex items-center gap-2.5">
              <RoutefoldMark className="h-6 w-6" tone="ivory" />
              <span className="font-display text-[1.0625rem] font-medium text-ivory">Routefold</span>
              <span className="chip border-white/15 bg-white/8 text-ivory/70">A ZeFi company</span>
            </div>

            <h2 className="display-lg mt-6 text-ivory">Model the next chain before you move</h2>
            <p className="mt-4 max-w-xl text-[0.9375rem] leading-relaxed text-ivory/70">
              Routefold builds a Multichain Digital Twin of your product and turns it into a ranked
              expansion strategy, architecture brief, risk register, and 30-day execution plan.
            </p>

            <ul className="mt-8 space-y-4">
              {ROUTEFOLD_CANDIDATES.map((candidate) => (
                <li key={candidate.chain}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[0.875rem] font-medium text-ivory">{candidate.chain}</span>
                    <span className="num text-[0.8125rem] text-ivory/70">{candidate.score}</span>
                  </div>
                  <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${candidate.score}%`,
                        background:
                          candidate.rank === 1
                            ? 'linear-gradient(90deg,#FF9A3D,#ED4F08)'
                            : 'rgba(255,255,255,0.3)',
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>

            <p className="mt-6 border-t border-white/10 pt-4 text-[0.6875rem] leading-relaxed text-ivory/40">
              Example scores for a hypothetical product. Real scores are produced against your own
              Multichain Digital Twin.
            </p>
          </div>
        </section>

        <div className="space-y-4">
          <section className="panel-solid p-5">
            <h2 className="label-tech text-ink-soft">What Routefold produces</h2>
            <ul className="mt-4 space-y-3">
              {ROUTEFOLD_DELIVERABLES.map((deliverable) => (
                <li key={deliverable.title}>
                  <p className="text-[0.9375rem] font-medium text-ink">{deliverable.title}</p>
                  <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-ink-soft">
                    {deliverable.body}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel-quiet p-5">
            <h2 className="label-tech text-ink-soft">Connection</h2>
            <p className="mt-3 text-[0.875rem] leading-relaxed text-ink-soft">
              {external ? (
                <>
                  This ZeFi deployment is linked to a Routefold instance at{' '}
                  <span className="num break-all text-ink">{publicConfig.routefoldUrl}</span>.
                </>
              ) : (
                <>
                  No separate Routefold deployment is configured, so Routefold links resolve to the
                  on-site product page. Set{' '}
                  <span className="num text-ink">NEXT_PUBLIC_ROUTEFOLD_URL</span> to point at a live
                  instance.
                </>
              )}
            </p>
            <Link href="/products/routefold" className="btn btn-ghost btn-sm mt-4 w-full">
              Read the product page
            </Link>
          </section>

          <section className="panel-quiet p-5">
            <h2 className="label-tech text-ink-soft">Ask ZeFi</h2>
            <p className="mt-3 text-[0.875rem] leading-relaxed text-ink-soft">
              The assistant recognises Routefold requests as their own intent category and routes them
              here rather than answering from general knowledge.
            </p>
            <Link
              href="/app/chat?prompt=Open%20Routefold%20and%20analyze%20my%20protocol%27s%20expansion%20options."
              className="btn btn-primary btn-sm mt-4 w-full"
            >
              Analyse expansion options
            </Link>
          </section>
        </div>
      </div>
    </AppSection>
  )
}
