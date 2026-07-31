import type { ReactNode } from 'react'

import { AmbientField } from './ambient-field'
import { SiteHeader } from './site-header'

/**
 * Interior page opening.
 *
 * The same framed plate as the home hero, at reduced amplitude — so every page
 * reads as part of one publication rather than as a separate template.
 */
export function PageHero({
  eyebrow,
  title,
  lede,
  aside,
  children,
}: {
  eyebrow: string
  title: ReactNode
  lede?: ReactNode
  aside?: ReactNode
  children?: ReactNode
}) {
  return (
    <section className="relative isolate px-3 pt-3 pb-4 sm:px-5 sm:pt-5 lg:px-7 lg:pt-6">
      <AmbientField variant="hero" className="-z-10 rounded-[32px]" />

      <div className="zefi-frame mx-auto w-full max-w-[96rem] overflow-hidden px-4 py-4 sm:px-7 sm:py-6 lg:px-10 lg:py-7">
        <SiteHeader />

        <div className="mt-12 grid gap-8 pb-6 sm:mt-16 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-end lg:gap-16 lg:pb-10">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="display-xl mt-5 text-ink">{title}</h1>
            {lede ? <p className="lede mt-6 max-w-2xl">{lede}</p> : null}
          </div>
          {aside ? <div className="lg:pb-2">{aside}</div> : null}
        </div>

        {children}
      </div>
    </section>
  )
}
