'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Menu, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { ZefiLogo } from '@/components/brand/zefi-mark'
import { publicConfig } from '@/lib/config/public'
import { cn } from '@/lib/utils'

const NAV = [
  { label: 'Intelligence', href: '/intelligence' },
  { label: 'Products', href: '/products' },
  { label: 'Routefold', href: '/products/routefold' },
  { label: 'Security', href: '/security' },
  { label: 'Company', href: '/about' },
] as const

export function SiteHeader({ tone = 'inside-frame' }: { tone?: 'inside-frame' | 'standalone' }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // The sheet closes from the links themselves rather than from an effect on
  // `pathname` — same behaviour, no cascading render.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const isActive = (href: string) =>
    href === '/products' ? pathname === '/products' : pathname.startsWith(href)

  return (
    <header
      className={cn(
        'relative z-50 flex items-center justify-between gap-4',
        tone === 'standalone' && 'shell py-5',
      )}
    >
      <Link
        href="/"
        aria-label="ZeFi home"
        className="shrink-0 rounded-lg transition-opacity hover:opacity-70"
      >
        <ZefiLogo className="text-[1.05rem]" />
      </Link>

      <nav aria-label="Primary" className="hidden items-center gap-0.5 lg:flex">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="nav-link"
            data-active={isActive(item.href)}
            aria-current={isActive(item.href) ? 'page' : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <Link href="/sign-in" className="nav-link hidden sm:inline-flex">
          Sign in
        </Link>
        <Link href="/app" prefetch={false} className="btn btn-primary btn-sm gap-1.5 sm:gap-2">
          <span>Launch ZeFi</span>
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="hairline grid h-9 w-9 place-items-center rounded-full bg-white/70 backdrop-blur-md transition-colors hover:bg-white lg:hidden"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            id="mobile-nav"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="panel absolute top-full right-0 left-0 mt-3 origin-top p-2 lg:hidden"
          >
            <nav aria-label="Mobile" className="flex flex-col">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-4 py-3 text-[0.95rem] transition-colors hover:bg-ember-50"
                  data-active={isActive(item.href)}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              ))}
              <div className="my-1 h-px bg-line" />
              <Link
                href="/sign-in"
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 text-[0.95rem] hover:bg-ember-50"
              >
                Sign in
              </Link>
              <a
                href={publicConfig.routefoldUrl}
                {...(publicConfig.routefoldIsExternal
                  ? { target: '_blank', rel: 'noreferrer noopener' }
                  : {})}
                className="rounded-xl px-4 py-3 text-[0.95rem] hover:bg-ember-50"
              >
                Launch Routefold
              </a>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  )
}
