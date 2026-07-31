'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'

import { FOUNDER_SOCIAL, PRODUCT_HUNT } from '@/lib/content/promos'

/**
 * The left rail.
 *
 * Lives in the page gutter rather than over the content. The hero plate is
 * capped at 96rem and its text starts 69px from the viewport edge at every
 * width down to 1024px, so a ~48px pill pinned near the edge clears the words
 * with room to spare. It does float over the plate's translucent border, which
 * reads as a dock sitting on the glass rather than an overlap.
 *
 * Hidden below `lg`, where the gutter closes up. The same links are in the
 * footer and the founders section, so nothing is only reachable here.
 */
export function SocialRail() {
  return (
    <motion.aside
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.9, delay: 1.4, ease: [0.16, 1, 0.3, 1] }}
      className="pointer-events-none fixed top-1/2 left-1.5 z-30 hidden -translate-y-1/2 lg:block min-[1700px]:left-5"
      aria-label="ZeFi elsewhere"
    >
      <div className="pointer-events-auto flex flex-col items-center gap-2.5 rounded-full border border-[rgba(23,19,15,0.09)] bg-white/80 px-1.5 py-3 shadow-[var(--shadow-panel)] backdrop-blur-md">
        <RailLink href={FOUNDER_SOCIAL.href} label={`${FOUNDER_SOCIAL.name} on X`}>
          <Image
            src={FOUNDER_SOCIAL.photo}
            alt=""
            width={30}
            height={30}
            className="h-[30px] w-[30px] rounded-full object-cover"
          />
        </RailLink>

        <span className="h-px w-5 bg-[rgba(23,19,15,0.12)]" />

        <RailLink href={FOUNDER_SOCIAL.href} label="Follow ZeFi's founder on X">
          <XMark />
        </RailLink>

        <RailLink href={PRODUCT_HUNT.post} label={PRODUCT_HUNT.label}>
          <ProductHuntMark />
        </RailLink>

        <span className="h-px w-5 bg-[rgba(23,19,15,0.12)]" />

        <span className="label-tech-sm rotate-180 py-2 text-[0.5625rem] text-ink-soft/70 [writing-mode:vertical-rl]">
          Live
        </span>
      </div>
    </motion.aside>
  )
}

function RailLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      title={label}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-all duration-400 ease-out-expo hover:-translate-y-0.5 hover:bg-cream hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-600"
    >
      {children}
    </a>
  )
}

function XMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function ProductHuntMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
      <circle cx="12" cy="12" r="11" className="fill-current opacity-15" />
      <path
        d="M13.2 7.2H9v9.6h2.1v-2.9h2.1a3.35 3.35 0 0 0 0-6.7Zm0 4.7h-2.1V9.2h2.1a1.35 1.35 0 0 1 0 2.7Z"
        className="fill-current"
      />
    </svg>
  )
}
