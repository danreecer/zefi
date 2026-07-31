import Link from 'next/link'

import { RoutefoldMark } from '@/components/brand/routefold-mark'
import { ZefiLogo } from '@/components/brand/zefi-mark'
import { publicConfig } from '@/lib/config/public'

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'ZeFi Intelligence', href: '/intelligence' },
      { label: 'How it works', href: '/how-it-works' },
      { label: 'Products', href: '/products' },
      { label: 'Routefold', href: '/products/routefold' },
      { label: 'Launch ZeFi', href: '/app' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Security', href: '/security' },
      { label: 'Documentation', href: '/docs' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
] as const

export function SiteFooter() {
  const year = 2026

  return (
    <footer className="relative border-t border-line bg-ivory">
      <div className="shell py-14 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)]">
          <div>
            <ZefiLogo className="text-[1.15rem]" />
            <p className="mt-4 max-w-sm text-[0.9375rem] leading-relaxed text-ink-soft">
              The intelligence and execution layer between human intent and onchain finance.
            </p>
            <p className="label-tech-sm mt-5 text-ink-muted">{publicConfig.appUrl.replace(/^https?:\/\//, '')}</p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {COLUMNS.map((column) => (
              <div key={column.title}>
                <h2 className="label-tech-sm text-ink-muted">{column.title}</h2>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        prefetch={link.href.startsWith('/app') ? false : undefined}
                        className="text-[0.9375rem] text-ink-soft transition-colors hover:text-ink"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 rule" />

        <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-2.5">
            <RoutefoldMark className="h-5 w-5" />
            <p className="text-[0.8125rem] text-ink-soft">
              <span className="font-medium text-ink">Routefold</span> — A ZeFi company.
            </p>
          </div>
          <p className="max-w-2xl text-[0.75rem] leading-relaxed text-ink-muted">
            ZeFi provides informational, technical, and transaction-planning tools. Outputs may contain
            incomplete assumptions and do not constitute financial, investment, legal, tax, compliance, or
            security-audit advice. ZeFi never requests or stores seed phrases or private keys. Connected
            wallets retain custody and sign transactions directly.
          </p>
        </div>

        <p className="mt-6 text-[0.75rem] text-ink-muted">© {year} ZeFi. All rights reserved.</p>
      </div>
    </footer>
  )
}
