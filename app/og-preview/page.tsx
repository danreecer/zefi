import type { Metadata } from 'next'

import { ZefiMark, ZefiWordmark } from '@/components/brand/zefi-mark'

export const metadata: Metadata = {
  title: 'Open Graph preview',
  robots: { index: false, follow: false },
}

/**
 * The Open Graph card, rendered at exactly 1200 × 630.
 *
 * Kept as a real route rather than generated from a static file so the social
 * card is produced from the same brand geometry, typography and colour tokens as
 * the product. Regenerate after any brand change:
 *
 *   pnpm exec tsx scripts/shoot.ts og /og-preview --w 1200 --h 630 --dpr 2 --sel "#og-card"
 *
 * Noindexed, and excluded from the sitemap.
 */
export default function OgPreviewPage() {
  return (
    <div className="grid min-h-dvh place-items-center bg-neutral-200 p-8">
      <div
        id="og-card"
        className="relative isolate flex h-[630px] w-[1200px] shrink-0 flex-col justify-between overflow-hidden p-16"
      >
        <div aria-hidden="true" className="ambient-field absolute inset-0 -z-10" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            backgroundImage:
              'radial-gradient(46% 52% at 62% 46%, rgba(255,104,26,0.55) 0%, rgba(255,104,26,0) 68%)',
          }}
        />

        <header className="flex items-center justify-between">
          <span className="inline-flex items-center gap-3">
            <ZefiMark className="h-11 w-11" />
            <ZefiWordmark className="h-7 w-auto" />
          </span>
          <span className="label-tech text-[0.8125rem] text-ink-soft">zefi.ae</span>
        </header>

        <div>
          <p className="display-hero text-[5.1rem] leading-[0.92] text-ink">
            Ask crypto anything
          </p>
          <p className="display-hero pl-[9%] text-[5.1rem] leading-[0.92] text-ink">
            <span className="text-ember-600/90">—</span> Plan it
          </p>
          <p className="display-hero flex justify-between text-[5.1rem] leading-[0.92] text-ink">
            <span>Verify it</span>
            <span>Execute</span>
          </p>
        </div>

        <footer className="flex items-end justify-between gap-8">
          <p className="max-w-xl text-[1.05rem] leading-relaxed text-ink-soft">
            The AI operating system for onchain finance. Turn natural-language intent into verified
            onchain actions.
          </p>
          <span className="chip chip-ember shrink-0 text-[0.8125rem]">Ask. Plan. Execute onchain.</span>
        </footer>
      </div>
    </div>
  )
}
