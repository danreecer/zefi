import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { AppShell } from '@/components/app/app-shell'
import { DeploymentBanner } from '@/components/app/deployment-banner'
import { AuthProvider } from '@/components/auth/auth-provider'
import { AuthUnavailable } from '@/components/auth/auth-unavailable'
import { WalletProviders } from '@/components/wallet/wallet-providers'
import { authConfigured } from '@/lib/auth/session'
import { describeCapabilities } from '@/lib/config/env'

export const metadata: Metadata = {
  title: { default: 'ZeFi', template: '%s — ZeFi' },
  robots: { index: false, follow: false },
}

export default function AppLayout({ children }: { children: ReactNode }) {
  if (!authConfigured()) {
    return (
      <div className="ambient-field-app flex min-h-dvh items-center justify-center px-4 py-16">
        <AuthUnavailable />
      </div>
    )
  }

  const capabilities = describeCapabilities()

  return (
    <AuthProvider>
      <WalletProviders>
        <AppShell banner={<DeploymentBanner capabilities={capabilities} />}>{children}</AppShell>
      </WalletProviders>
    </AuthProvider>
  )
}
