import Link from 'next/link'
import type { ReactNode } from 'react'

import { AuthProvider } from '@/components/auth/auth-provider'
import { ZefiLogo } from '@/components/brand/zefi-mark'
import { AmbientField } from '@/components/marketing/ambient-field'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <div className="relative isolate flex min-h-dvh flex-col px-3 py-3 sm:px-5 sm:py-5">
        <AmbientField variant="hero" className="-z-10 rounded-[32px]" />

        <div className="zefi-frame mx-auto flex w-full max-w-[96rem] flex-1 flex-col overflow-hidden px-4 py-4 sm:px-7 sm:py-6 lg:px-10">
          <header className="flex items-center justify-between">
            <Link href="/" aria-label="ZeFi home" className="rounded-lg transition-opacity hover:opacity-70">
              <ZefiLogo className="text-[1.05rem]" />
            </Link>
            <Link href="/how-it-works" className="nav-link">
              How it works
            </Link>
          </header>

          <main className="flex flex-1 items-center justify-center py-10">{children}</main>

          <footer className="pb-2">
            <p className="mx-auto max-w-2xl text-center text-[0.75rem] leading-relaxed text-ink-muted">
              ZeFi never requests or stores seed phrases or private keys. Connected wallets retain custody
              and sign transactions directly.
            </p>
          </footer>
        </div>
      </div>
    </AuthProvider>
  )
}
