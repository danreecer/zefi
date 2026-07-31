'use client'

import { ArrowUpRight, X } from 'lucide-react'

import { PRODUCT_HUNT } from '@/lib/content/promos'
import { useDismissable } from './use-promo-state'

/**
 * The launch bar.
 *
 * Sits in normal flow above the header rather than fixed over it, so it pushes
 * the page down instead of covering the first thing a visitor came to read.
 * Once dismissed it stays dismissed.
 */
export function AnnouncementBar() {
  const [dismissed, dismiss] = useDismissable('announcement')
  if (dismissed) return null

  return (
    <div className="relative z-30 bg-ink text-ivory">
      <div className="mx-auto flex max-w-[96rem] items-center gap-3 px-4 py-2.5 sm:px-7 lg:px-10">
        <span className="hidden h-1.5 w-1.5 shrink-0 animate-pulse-soft rounded-full bg-ember-500 sm:block" />

        <a
          href={PRODUCT_HUNT.post}
          target="_blank"
          rel="noreferrer noopener"
          className="group flex min-w-0 flex-1 items-center gap-2 text-[0.8125rem] leading-snug"
        >
          <span className="label-tech-sm hidden shrink-0 text-ember-400 sm:inline">Launch</span>
          <span className="truncate">
            {PRODUCT_HUNT.label} — back it and tell us what to build next.
          </span>
          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-70 transition-transform duration-500 ease-out-expo group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="-mr-1 shrink-0 rounded-full p-1.5 text-ivory/60 transition-colors hover:bg-white/10 hover:text-ivory focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
