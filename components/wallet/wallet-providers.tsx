'use client'

import { useState, type ReactNode } from 'react'
import { WagmiProvider } from 'wagmi'

import { getWagmiConfig } from '@/lib/wallet/config'

/**
 * Wallet connection, mounted only where a wallet can actually be used.
 *
 * Connectors do eager work on construction — WalletConnect opens a relay
 * connection, Coinbase Wallet loads its SDK — so this stays out of the root
 * layout. The marketing site has no wallet UI and therefore pays none of that
 * cost, in bytes or in network calls.
 *
 * `QueryClientProvider` is supplied by the root layout; wagmi only requires it
 * to be an ancestor, not a direct parent.
 */
export function WalletProviders({ children }: { children: ReactNode }) {
  const [config] = useState(() => getWagmiConfig())
  return <WagmiProvider config={config}>{children}</WagmiProvider>
}
