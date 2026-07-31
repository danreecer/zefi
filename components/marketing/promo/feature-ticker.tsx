'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { FEATURE_NOTES, type CapabilityKey, type FeatureNote } from '@/lib/content/promos'
import { useDismissable } from './use-promo-state'

/**
 * The feature ticker.
 *
 * The genre this borrows from is the "someone in Denver just signed up" toast,
 * which is almost always fabricated. This one cannot be: every note names a
 * capability, and a note whose capability is switched off in this deployment is
 * filtered out before anything renders. What it promotes is therefore true of
 * the deployment the visitor is actually looking at.
 *
 * It shows three notes and then stops. A ticker that never ends is an
 * irritation, not a feature.
 */

const FIRST_DELAY = 14_000
const GAP = 15_000
const DWELL = 9_000
const MAX_SHOWN = 3

export function FeatureTicker({
  enabled,
  suppressed,
}: {
  enabled: Set<CapabilityKey>
  suppressed: boolean
}) {
  const [dismissed, dismiss] = useDismissable('ticker')
  const [index, setIndex] = useState(-1)
  const [visible, setVisible] = useState(false)

  const notes = FEATURE_NOTES.filter((note) => note.requires === 'always' || enabled.has(note.requires))

  useEffect(() => {
    if (dismissed || notes.length === 0) return

    let shown = 0
    const timers: ReturnType<typeof setTimeout>[] = []

    const cycle = () => {
      if (shown >= MAX_SHOWN || shown >= notes.length) return
      const current = shown
      shown += 1
      setIndex(current)
      setVisible(true)
      timers.push(setTimeout(() => setVisible(false), DWELL))
      timers.push(setTimeout(cycle, GAP))
    }

    timers.push(setTimeout(cycle, FIRST_DELAY))
    return () => timers.forEach(clearTimeout)
  }, [dismissed, notes.length])

  const note: FeatureNote | undefined = index >= 0 ? notes[index] : undefined
  const show = visible && !suppressed && !dismissed && Boolean(note)

  return (
    <AnimatePresence>
      {show && note && (
        <motion.div
          initial={{ opacity: 0, x: -20, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -14, scale: 0.98 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-5 left-5 z-30 hidden w-[19rem] lg:block"
        >
          <Link
            href={note.href}
            onClick={dismiss}
            className="group block rounded-2xl border border-[rgba(23,19,15,0.1)] bg-white/90 p-4 shadow-[var(--shadow-panel)] backdrop-blur-xl transition-transform duration-500 ease-out-expo hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-ember-500" />
              <span className="label-tech-sm text-ember-700">Available now</span>
              <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-ink-soft/50 transition-transform duration-500 ease-out-expo group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
            <p className="mt-2 text-[0.9375rem] font-medium text-ink">{note.title}</p>
            <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-soft">{note.detail}</p>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
