'use client'

import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'
import { useRef } from 'react'

import { SectionHeader } from '@/components/marketing/section-header'
import { cn } from '@/lib/utils'

/**
 * INTENT TO EXECUTION — the signature ZeFi visual.
 *
 * Six stages sit on one route line. Scroll drives the line's draw and lights
 * each node in turn, so the reader physically moves a prompt through the system
 * rather than reading a diagram of it.
 *
 * With `prefers-reduced-motion` the whole thing renders in its completed state:
 * every stage lit, line fully drawn, no sticky section. Nothing is lost.
 */

const STAGES = [
  {
    key: 'prompt',
    label: 'Prompt',
    title: 'A sentence, not a form',
    detail:
      'The user writes what they want in their own words. No chain selector, no token dropdown, no hex.',
    technical: 'Input sanitised · framed as untrusted data · 4,000 character ceiling',
  },
  {
    key: 'intent',
    label: 'Intent',
    title: 'Language becomes structure',
    detail:
      'ZeFi extracts a typed intent — action, networks, asset, amount, recipient, priority — and scores its own confidence.',
    technical: 'Forced tool call · Zod-validated · one repair attempt, then an error',
  },
  {
    key: 'plan',
    label: 'Plan',
    title: 'Structure becomes a sequence',
    detail:
      'A deterministic planner resolves every reference against the chain registry and builds the ordered steps. The model never supplies an address, an amount or a fee.',
    technical: 'Registry lookup · EIP-55 checksums · exact-amount approvals only',
  },
  {
    key: 'simulation',
    label: 'Simulation',
    title: 'The plan is tested before it is offered',
    detail:
      'Chain, asset, decimals, balance, recipient and approval scope are checked deterministically. A check that could not run is reported as skipped, never as passed.',
    technical: 'Local validation always · deep simulation when a provider is configured',
  },
  {
    key: 'approval',
    label: 'Approval',
    title: 'A human decides',
    detail:
      'ZeFi states in plain language what will happen, what it costs, and what could go wrong — then waits. The confirm control names the real action.',
    technical: '“Review 250 USDC transfer” · never “Execute instantly”',
  },
  {
    key: 'onchain',
    label: 'Onchain action',
    title: 'The wallet signs, not ZeFi',
    detail:
      'The transaction is handed to the connected wallet. ZeFi holds no keys and takes no custody. It tracks the hash and explains what happened.',
    technical: 'Idempotent recording · status tracking · explorer link',
  },
] as const

export function IntentToExecution() {
  const ref = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  })

  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 })
  const lineLength = useTransform(smooth, [0.04, 0.92], [0, 1])

  if (reduceMotion) {
    return (
      <section className="section" id="intent-to-execution">
        <div className="shell">
          <Header />
          <ol className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {STAGES.map((stage, index) => (
              <li key={stage.key}>
                <StageCard stage={stage} index={index} active />
              </li>
            ))}
          </ol>
        </div>
      </section>
    )
  }

  return (
    <section ref={ref} id="intent-to-execution" className="relative h-[300vh]">
      <div className="sticky top-0 flex h-dvh flex-col justify-center overflow-hidden py-12">
        <div className="shell w-full">
          <Header />

          {/* ── The route ────────────────────────────────────────────── */}
          <div className="relative mt-10 lg:mt-14">
            <svg
              viewBox="0 0 1200 60"
              preserveAspectRatio="none"
              className="hidden h-14 w-full lg:block"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M40 30H1160"
                stroke="rgba(23,19,15,0.12)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <motion.path
                d="M40 30H1160"
                stroke="#ED4F08"
                strokeWidth="1.5"
                strokeLinecap="round"
                style={{ pathLength: lineLength }}
              />
            </svg>

            <ol className="grid gap-3 sm:grid-cols-2 lg:absolute lg:inset-x-0 lg:top-0 lg:grid-cols-6 lg:gap-3">
              {STAGES.map((stage, index) => (
                <Node key={stage.key} stage={stage} index={index} progress={smooth} />
              ))}
            </ol>
          </div>

          {/* ── Active stage detail ──────────────────────────────────── */}
          <div className="relative mt-6 min-h-[15rem] lg:mt-28 lg:min-h-[13rem]">
            {STAGES.map((stage, index) => (
              <ActiveDetail key={stage.key} stage={stage} index={index} progress={smooth} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Header() {
  return (
    <SectionHeader
      eyebrow="From intent to execution"
      title={
        <>
          Six stages sit between
          <br />
          a sentence and a signature
        </>
      }
      lede="Natural language on its own is not enough to move money. ZeFi puts verification and simulation between the prompt and the transaction — and shows you every stage."
    />
  )
}

type Stage = (typeof STAGES)[number]

/**
 * Scroll window for a stage. Stage one owns the section's resting state, so its
 * window opens at zero — otherwise the first card sits half-faded before the
 * reader has scrolled at all.
 */
function stageWindow(index: number) {
  const total = STAGES.length
  const span = 0.9 / total
  const start = index * span
  return { start, end: start + span, first: index === 0 }
}

function Node({
  stage,
  index,
  progress,
}: {
  stage: Stage
  index: number
  progress: ReturnType<typeof useSpring>
}) {
  const { start } = stageWindow(index)
  const active = useTransform(progress, (value): number => (value >= start - 0.02 ? 1 : 0))
  const dotScale = useTransform(active, [0, 1], [0.72, 1])
  const dotColor = useTransform(active, [0, 1], ['rgba(23,19,15,0.16)', '#ED4F08'])
  const labelColor = useTransform(active, [0, 1], ['rgba(120,108,96,1)', 'rgba(23,19,15,1)'])

  return (
    <li className="flex items-center gap-2.5 lg:flex-col lg:items-start lg:gap-3">
      <div className="flex items-center lg:h-[60px] lg:w-full lg:justify-start">
        <motion.span
          className="block h-2.5 w-2.5 shrink-0 rounded-full lg:ml-[3px]"
          style={{ scale: dotScale, backgroundColor: dotColor }}
        />
      </div>
      <div className="lg:-mt-2">
        <motion.p className="label-tech-sm" style={{ color: labelColor }}>
          {String(index + 1).padStart(2, '0')} · {stage.label}
        </motion.p>
      </div>
    </li>
  )
}

function ActiveDetail({
  stage,
  index,
  progress,
}: {
  stage: Stage
  index: number
  progress: ReturnType<typeof useSpring>
}) {
  const { start, end, first } = stageWindow(index)
  const fadeIn: [number, number] = first ? [0, 0.0001] : [start - 0.045, start + 0.015]
  const opacity = useTransform(
    progress,
    [fadeIn[0], fadeIn[1], end - 0.015, end + 0.035],
    [0, 1, 1, 0],
  )
  const y = useTransform(progress, fadeIn, [first ? 0 : 16, 0])

  return (
    <motion.div style={{ opacity, y }} className="absolute inset-x-0 top-0">
      <StageCard stage={stage} index={index} active />
    </motion.div>
  )
}

function StageCard({ stage, index, active }: { stage: Stage; index: number; active: boolean }) {
  return (
    <div className={cn('panel-solid h-full p-5 sm:p-6', !active && 'opacity-60')}>
      <div className="flex items-center gap-2">
        <span className="num text-[0.6875rem] text-ember-700">{String(index + 1).padStart(2, '0')}</span>
        <span className="label-tech-sm text-ink-muted">{stage.label}</span>
      </div>
      <h3 className="display-md mt-3 text-ink">{stage.title}</h3>
      <p className="mt-2.5 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-soft">{stage.detail}</p>
      <p className="num mt-4 border-t border-line pt-3 text-[0.6875rem] leading-relaxed text-ink-muted">
        {stage.technical}
      </p>
    </div>
  )
}
