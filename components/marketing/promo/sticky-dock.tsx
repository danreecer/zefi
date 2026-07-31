'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, X } from 'lucide-react'
import Link from 'next/link'

import { PRODUCT_HUNT } from '@/lib/content/promos'

/**
 * The bottom dock.
 *
 * Held back until the visitor has scrolled past the hero, because the hero
 * already carries the primary call to action and stacking a second one over it
 * would just cover the product preview. Visibility is decided by the layer, so
 * the back-to-top button can know whether it needs to sit above this.
 */
export function StickyDock({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:px-5 sm:pb-5"
        >
          <div className="mx-auto flex max-w-4xl items-center gap-3 rounded-2xl border border-[rgba(23,19,15,0.1)] bg-white/90 p-2.5 pl-4 shadow-[var(--shadow-panel)] backdrop-blur-xl sm:gap-5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.875rem] font-medium text-ink">
                Ask crypto anything — then read the plan before you sign.
              </p>
              <p className="hidden truncate text-[0.75rem] text-ink-soft sm:block">
                Free to use. Your wallet keeps custody the whole way through.
              </p>
            </div>

            <a
              href={PRODUCT_HUNT.post}
              target="_blank"
              rel="noreferrer noopener"
              className="hidden shrink-0 rounded-[10px] transition-opacity duration-300 hover:opacity-80 lg:block"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={PRODUCT_HUNT.badge} alt={PRODUCT_HUNT.label} width={160} height={35} />
            </a>

            <Link href="/app" prefetch={false} className="btn btn-primary group shrink-0">
              Launch ZeFi
              <ArrowRight className="h-4 w-4 transition-transform duration-500 ease-out-expo group-hover:translate-x-0.5" />
            </Link>

            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss"
              className="shrink-0 rounded-full p-1.5 text-ink-soft/60 transition-colors hover:bg-cream hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
