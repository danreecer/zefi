import type { ReactNode } from 'react'

import { PageHero } from './page-hero'

export interface LegalSection {
  heading: string
  body: string[]
}

export function LegalPage({
  eyebrow,
  title,
  updated,
  intro,
  sections,
}: {
  eyebrow: string
  title: string
  updated: string
  intro: ReactNode
  sections: readonly LegalSection[]
}) {
  return (
    <>
      <PageHero
        eyebrow={eyebrow}
        title={title}
        lede={intro}
        aside={
          <div className="panel p-5">
            <p className="label-tech-sm text-ink-muted">Last updated</p>
            <p className="num mt-1.5 text-[0.9375rem] text-ink">{updated}</p>
          </div>
        }
      />

      <section className="section">
        <div className="shell">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] lg:gap-16">
            <nav aria-label="Contents" className="lg:sticky lg:top-8 lg:self-start">
              <p className="label-tech-sm text-ink-muted">Contents</p>
              <ol className="mt-4 space-y-2">
                {sections.map((section, index) => (
                  <li key={section.heading}>
                    <a
                      href={`#${slug(section.heading)}`}
                      className="flex gap-2.5 text-[0.875rem] leading-snug text-ink-soft transition-colors hover:text-ink"
                    >
                      <span className="num text-[0.6875rem] text-ink-faint">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      {section.heading}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            <div className="max-w-3xl space-y-10">
              {sections.map((section, index) => (
                <section key={section.heading} id={slug(section.heading)} className="scroll-mt-24">
                  <h2 className="display-md flex items-baseline gap-3 text-ink">
                    <span className="num text-[0.75rem] text-ember-700">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {section.heading}
                  </h2>
                  <div className="mt-4 space-y-4">
                    {section.body.map((paragraph) => (
                      <p
                        key={paragraph.slice(0, 48)}
                        className="text-[1rem] leading-relaxed text-ink-soft"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
