'use client'

import { UserButton } from '@clerk/nextjs'
import { AnimatePresence, motion } from 'framer-motion'
import {
  History,
  LayoutGrid,
  Menu,
  MessageSquare,
  Settings,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, type ReactNode } from 'react'

import { RoutefoldMark } from '@/components/brand/routefold-mark'
import { ZefiLogo } from '@/components/brand/zefi-mark'
import { WalletButton } from '@/components/wallet/wallet-button'
import { publicConfig } from '@/lib/config/public'
import { cn } from '@/lib/utils'

const NAV = [
  { label: 'Overview', href: '/app', icon: LayoutGrid, exact: true },
  { label: 'Assistant', href: '/app/chat', icon: MessageSquare },
  { label: 'Wallet', href: '/app/wallet', icon: Wallet },
  { label: 'Plans', href: '/app/plans', icon: Sparkles },
  { label: 'History', href: '/app/history', icon: History },
  { label: 'Routefold', href: '/app/routefold', icon: RoutefoldMark },
  { label: 'Settings', href: '/app/settings', icon: Settings },
] as const

export function AppShell({
  children,
  banner,
}: {
  children: ReactNode
  /** Deployment-state notices rendered above the content. */
  banner?: ReactNode
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <div className="relative isolate flex min-h-dvh">
      <div aria-hidden="true" className="ambient-field-app pointer-events-none absolute inset-0 -z-10" />

      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <aside className="sticky top-0 hidden h-dvh w-[15.5rem] shrink-0 flex-col border-r border-line bg-white/55 backdrop-blur-xl lg:flex">
        <div className="px-5 py-5">
          <Link href="/" aria-label="ZeFi home" className="inline-block rounded-lg hover:opacity-70">
            <ZefiLogo className="text-[1.05rem]" />
          </Link>
        </div>

        <nav aria-label="Application" className="flex-1 px-3">
          <ul className="space-y-0.5">
            {NAV.map((item) => (
              <li key={item.href}>
                <NavLink item={item} active={isActive(item.href, 'exact' in item ? item.exact : false)} />
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-line p-3">
          <a
            href={publicConfig.routefoldUrl}
            {...(publicConfig.routefoldIsExternal
              ? { target: '_blank', rel: 'noreferrer noopener' }
              : {})}
            className="block rounded-xl border border-line bg-ivory/70 p-3.5 transition-colors hover:bg-white"
          >
            <div className="flex items-center gap-2">
              <RoutefoldMark className="h-4 w-4" />
              <span className="text-[0.8125rem] font-medium text-ink">Routefold</span>
            </div>
            <p className="mt-1.5 text-[0.75rem] leading-snug text-ink-muted">
              Model the next chain before you move.
            </p>
          </a>
          <p className="mt-3 px-1 text-[0.6875rem] leading-relaxed text-ink-muted">
            ZeFi never requests seed phrases or private keys.
          </p>
        </div>
      </aside>

      {/* ── Main ───────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-line bg-ivory/80 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls="app-mobile-nav"
              aria-label={open ? 'Close navigation' : 'Open navigation'}
              className="hairline grid h-9 w-9 place-items-center rounded-full bg-white/70 lg:hidden"
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <Link href="/" aria-label="ZeFi home" className="lg:hidden">
              <ZefiLogo className="text-[0.95rem]" />
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <WalletButton />
            {publicConfig.authConfigured ? (
              <UserButton
                appearance={{ elements: { avatarBox: 'h-8 w-8' } }}
                userProfileMode="navigation"
                userProfileUrl="/app/settings"
              />
            ) : null}
          </div>
        </header>

        <AnimatePresence>
          {open ? (
            <motion.nav
              id="app-mobile-nav"
              aria-label="Application"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden border-b border-line bg-white/85 backdrop-blur-xl lg:hidden"
            >
              <ul className="space-y-0.5 p-3">
                {NAV.map((item) => (
                  <li key={item.href}>
                    <NavLink
                      item={item}
                      active={isActive(item.href, 'exact' in item ? item.exact : false)}
                      onNavigate={() => setOpen(false)}
                    />
                  </li>
                ))}
              </ul>
            </motion.nav>
          ) : null}
        </AnimatePresence>

        {banner}

        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: (typeof NAV)[number]
  active: boolean
  onNavigate?: () => void
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-2.5 rounded-xl px-3 py-2 text-[0.875rem] transition-colors',
        active ? 'bg-white text-ink shadow-[0_1px_2px_rgba(23,19,15,0.05)]' : 'text-ink-soft hover:bg-white/60 hover:text-ink',
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-ember-600' : 'text-ink-faint')} />
      {item.label}
    </Link>
  )
}
