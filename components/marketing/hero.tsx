'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { publicConfig } from '@/lib/config/public'
import { AmbientField } from './ambient-field'
import { HeroPreview } from './hero-preview'
import { RouteLines } from './route-lines'
import { SiteHeader } from './site-header'

/**
 * The hero.
 *
 * A single framed plate holding the whole opening composition: minimal
 * navigation, an oversized asymmetric headline, and the product itself sitting
 * inside the frame rather than screenshotted below it. The ambient field runs
 * full-bleed behind and shows through the frame's translucent border, so the
 * plate reads as printed on the light rather than pasted over it.
 */

const line = {
  hidden: { opacity: 0, y: '38%' },
  show: (index: number) => ({
    opacity: 1,
    y: '0%',
    transition: { duration: 1.05, delay: 0.08 + index * 0.11, ease: [0.16, 1, 0.3, 1] as const },
  }),
}

const fade = {
  hidden: { opacity: 0, y: 14 },
  show: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay: 0.42 + index * 0.08, ease: [0.16, 1, 0.3, 1] as const },
  }),
}

export function Hero() {
  return (
    <section className="relative isolate px-3 pt-3 pb-4 sm:px-5 sm:pt-5 lg:px-7 lg:pt-6">
      <AmbientField variant="hero" className="-z-10 rounded-[32px]" />

      <div className="zefi-frame mx-auto flex w-full max-w-[96rem] flex-col overflow-hidden px-4 py-4 sm:px-7 sm:py-6 lg:px-10 lg:py-7">
        <RouteLines className="pointer-events-none absolute inset-x-0 top-[22%] -z-10 h-[62%] w-full opacity-70" />

        <SiteHeader />

        {/* ── Headline ─────────────────────────────────────────────────── */}
        <div className="mt-8 sm:mt-11 lg:mt-12">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="flex flex-wrap items-center gap-2"
          >
            <span className="chip chip-ember">
              <span className="inline-block h-1.5 w-1.5 animate-pulse-soft rounded-full bg-ember-600" />
              Live · open to everyone
            </span>
            <span className="label-tech-sm text-ink-soft/80">Ask. Plan. Execute onchain.</span>
          </motion.div>

          <h1 className="mt-4 text-ink sm:mt-6">
            <span className="sr-only">
              Ask crypto anything — plan it, verify it, execute.
            </span>

            <span aria-hidden="true" className="block">
              <Line index={0}>
                <span className="display-hero block">Ask crypto anything</span>
              </Line>

              <Line index={1}>
                <span className="display-hero block sm:pl-[8%] lg:pl-[11%]">
                  <span className="text-ember-600/90">—</span> Plan it
                </span>
              </Line>

              <Line index={2}>
                <span className="display-hero flex flex-wrap items-baseline justify-between gap-x-8">
                  <span>Verify it</span>
                  <span className="text-ink/90">Execute</span>
                </span>
              </Line>
            </span>
          </h1>
        </div>

        {/* ── Supporting row ───────────────────────────────────────────── */}
        <div className="mt-6 grid gap-6 sm:mt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:items-end lg:gap-12">
          <motion.div variants={fade} custom={0} initial="hidden" animate="show" className="max-w-xl">
            <p className="lede">
              Research markets, understand your wallet, model complex transactions, and turn
              natural-language intent into verified onchain actions.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <Link href="/app" prefetch={false} className="btn btn-primary btn-lg group">
                Launch ZeFi
                <ArrowRight className="h-4 w-4 transition-transform duration-500 ease-out-expo group-hover:translate-x-0.5" />
              </Link>
              <a
                href={publicConfig.routefoldUrl}
                {...(publicConfig.routefoldIsExternal
                  ? { target: '_blank', rel: 'noreferrer noopener' }
                  : {})}
                className="btn btn-paper btn-lg"
              >
                Explore Routefold
              </a>
            </div>
          </motion.div>

          <motion.div
            variants={fade}
            custom={1}
            initial="hidden"
            animate="show"
            className="lg:text-right"
          >
            <p className="label-tech-sm text-ink-soft">
              Available now — assistant, wallet intelligence, transaction planning, local simulation.
            </p>
            <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-muted">
              Swap and bridge execution are plan-only until a routing provider is connected.{' '}
              <Link href="/how-it-works" className="link-underline text-ink">
                See what runs today
              </Link>
              .
            </p>
          </motion.div>
        </div>

        {/* ── Product preview ──────────────────────────────────────────── */}
        <div className="mt-7 sm:mt-9 lg:mt-10">
          <HeroPreview />
        </div>
      </div>
    </section>
  )
}

function Line({ children, index }: { children: React.ReactNode; index: number }) {
  return (
    <span className="block overflow-hidden pb-[0.06em]">
      <motion.span variants={line} custom={index} initial="hidden" animate="show" className="block">
        {children}
      </motion.span>
    </span>
  )
}
