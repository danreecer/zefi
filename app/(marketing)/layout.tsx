import type { ReactNode } from 'react'

import { PromoLayer } from '@/components/marketing/promo/promo-layer'
import { SiteFooter } from '@/components/marketing/site-footer'
import { describeCapabilities } from '@/lib/config/env'
import type { CapabilityKey } from '@/lib/content/promos'

/**
 * Which capabilities the promotional surfaces may advertise.
 *
 * Read on the server from the same function `/api/health` uses, so a feature
 * switched off in this deployment is never promoted on it.
 */
function enabledCapabilities(): CapabilityKey[] {
  const capabilities = describeCapabilities()
  const enabled: CapabilityKey[] = ['always']
  if (capabilities.ai === 'configured') enabled.push('ai')
  if (capabilities.persistence === 'configured') enabled.push('persistence')
  if (capabilities.deepSimulation === 'configured') enabled.push('deepSimulation')
  if (capabilities.execution !== 'disabled') enabled.push('execution')
  return enabled
}

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-ivory"
      >
        Skip to content
      </a>
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <PromoLayer enabled={enabledCapabilities()} />
    </div>
  )
}
