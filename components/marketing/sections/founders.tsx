import { ArrowUpRight } from 'lucide-react'
import Image from 'next/image'

import { SectionHeader } from '@/components/marketing/section-header'
import { FOUNDERS } from '@/lib/content/founders'
import { cn } from '@/lib/utils'

/**
 * Founders.
 *
 * Driven entirely by `lib/content/founders.ts`. An empty list renders nothing at
 * all — the section never shows a silhouette, a "coming soon", or an invented
 * person. Layout adapts between one founder (an editorial spread) and several
 * (a grid), so a single-founder company does not look like a team page with
 * gaps in it.
 */
export function FoundersSection({
  variant = 'full',
  className,
}: {
  /** `compact` drops the long statement — used on the home page. */
  variant?: 'full' | 'compact'
  className?: string
}) {
  if (FOUNDERS.length === 0) return null

  const solo = FOUNDERS.length === 1
  const founder = FOUNDERS[0]

  return (
    <section className={cn('section', className)} id="founders">
      <div className="shell">
        <SectionHeader
          eyebrow={solo ? 'Founder' : 'Founders'}
          title={solo ? 'Who is building this' : 'Who is building ZeFi'}
          lede={
            variant === 'full'
              ? 'ZeFi is a small company with a specific thesis about where AI belongs in onchain finance, and where it does not.'
              : undefined
          }
        />

        {solo && founder ? (
          <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,auto)_minmax(0,1fr)] lg:gap-14">
            <div className="shrink-0">
              <div className="relative w-fit">
                <div
                  aria-hidden="true"
                  className="bloom absolute -inset-6 -z-10"
                  style={{
                    background:
                      'radial-gradient(circle, rgba(255,111,34,0.28) 0%, rgba(255,154,61,0) 70%)',
                    filter: 'blur(38px)',
                  }}
                />
                <Image
                  src={founder.photo}
                  alt={founder.photoAlt}
                  width={400}
                  height={400}
                  sizes="(max-width: 1024px) 168px, 224px"
                  className="h-[168px] w-[168px] rounded-[22px] border border-line object-cover shadow-[var(--shadow-panel)] lg:h-56 lg:w-56"
                  priority={false}
                />
              </div>

              <div className="mt-5">
                <p className="font-display text-[1.35rem] leading-tight font-medium text-ink">
                  {founder.name}
                </p>
                <p className="label-tech-sm mt-1.5 text-ember-700">{founder.role}</p>

                {founder.links.length > 0 ? (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {founder.links.map((link) => (
                      <li key={link.href}>
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="chip transition-colors hover:bg-white hover:text-ink"
                        >
                          {link.display}
                          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>

            {variant === 'full' ? (
              <div className="max-w-2xl">
                <blockquote className="space-y-5">
                  {founder.statement.map((paragraph, index) => (
                    <p
                      key={paragraph.slice(0, 40)}
                      className={
                        index === 0
                          ? 'font-display text-[1.375rem] leading-[1.4] tracking-[-0.01em] text-ink sm:text-[1.5rem]'
                          : 'text-[1.0625rem] leading-relaxed text-ink-soft'
                      }
                    >
                      {paragraph}
                    </p>
                  ))}
                </blockquote>
                <p className="num mt-7 border-t border-line pt-5 text-[0.6875rem] leading-relaxed text-ink-muted">
                  ZeFi publishes team, funding and traction details only when they are true. This page
                  lists what is.
                </p>
              </div>
            ) : (
              <div className="max-w-2xl self-center">
                <p className="font-display text-[1.25rem] leading-[1.45] tracking-[-0.01em] text-ink">
                  {founder.statement[0]}
                </p>
              </div>
            )}
          </div>
        ) : (
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FOUNDERS.map((person) => (
              <li key={person.name} className="panel-solid p-6">
                <Image
                  src={person.photo}
                  alt={person.photoAlt}
                  width={400}
                  height={400}
                  sizes="112px"
                  className="h-28 w-28 rounded-[18px] border border-line object-cover"
                />
                <p className="font-display mt-4 text-[1.125rem] font-medium text-ink">{person.name}</p>
                <p className="label-tech-sm mt-1 text-ember-700">{person.role}</p>
                {variant === 'full' && person.statement[0] ? (
                  <p className="mt-3 text-[0.875rem] leading-relaxed text-ink-soft">
                    {person.statement[0]}
                  </p>
                ) : null}
                {person.links.length > 0 ? (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {person.links.map((link) => (
                      <li key={link.href}>
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="chip transition-colors hover:bg-white hover:text-ink"
                        >
                          {link.display}
                          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
