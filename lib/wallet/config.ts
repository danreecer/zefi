'use client'

import { createConfig, http, type Config } from 'wagmi'
import { arbitrum, base, mainnet, optimism, polygon } from 'wagmi/chains'
import { coinbaseWallet, injected, walletConnect } from 'wagmi/connectors'

import { publicConfig } from '@/lib/config/public'

/**
 * Wallet connection.
 *
 * ZeFi is non-custodial by construction. There is no wallet client with a
 * private key anywhere in this codebase, no key material is ever transmitted to
 * the server, and no code path asks for a seed phrase. The user's own wallet
 * signs; ZeFi supplies the transaction to be signed and the reasoning behind it.
 */

export const SUPPORTED_CHAINS = [mainnet, base, arbitrum, optimism, polygon] as const

let cached: Config | null = null

export function getWagmiConfig(): Config {
  if (cached) return cached

  const projectId = publicConfig.walletConnectProjectId

  cached = createConfig({
    chains: SUPPORTED_CHAINS,
    connectors: [
      injected({ shimDisconnect: true }),
      coinbaseWallet({ appName: 'ZeFi', appLogoUrl: `${publicConfig.appUrl}/brand/zefi-symbol.svg` }),
      // WalletConnect is only registered when a project id exists. Registering
      // it without one produces a connector that fails at click time.
      ...(projectId
        ? [
            walletConnect({
              projectId,
              showQrModal: true,
              metadata: {
                name: 'ZeFi',
                description: 'The AI operating system for onchain finance.',
                url: publicConfig.appUrl,
                icons: [`${publicConfig.appUrl}/brand/zefi-symbol.svg`],
              },
            }),
          ]
        : []),
    ],
    transports: {
      [mainnet.id]: http(publicConfig.rpcOverrides.ethereum),
      [base.id]: http(publicConfig.rpcOverrides.base),
      [arbitrum.id]: http(publicConfig.rpcOverrides.arbitrum),
      [optimism.id]: http(publicConfig.rpcOverrides.optimism),
      [polygon.id]: http(publicConfig.rpcOverrides.polygon),
    },
    ssr: true,
  })

  return cached
}

export const walletConnectAvailable = Boolean(publicConfig.walletConnectProjectId)
