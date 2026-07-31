'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp } from 'lucide-react'

/**
 * Back to top.
 *
 * Shares the dock's scroll threshold, and lifts above it when the dock is on
 * screen so the two never sit on top of each other. Uses `scrollTo` with smooth
 * behaviour, which the page already opts into globally.
 */
export function BackToTop({ visible, raised }: { visible: boolean; raised: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Back to top"
          title="Back to top"
          className={`fixed right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(23,19,15,0.1)] bg-white/90 text-ink shadow-[var(--shadow-panel)] backdrop-blur-xl transition-all duration-500 ease-out-expo hover:-translate-y-0.5 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-600 sm:right-6 ${
            raised ? 'bottom-[6.5rem] sm:bottom-28' : 'bottom-5 sm:bottom-6'
          }`}
        >
          <ArrowUp className="h-4 w-4" />
        </motion.button>
      )}
    </AnimatePresence>
  )
}
