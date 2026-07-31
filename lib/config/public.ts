/**
 * Client-safe configuration.
 *
 * Next.js only inlines `process.env.NEXT_PUBLIC_*` when it is accessed as a
 * literal member expression, so every value here is read literally and never
 * through a computed key. Nothing secret may be added to this file.
 */

const raw = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL,
  routefoldUrl: process.env.NEXT_PUBLIC_ROUTEFOLD_URL,
  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  demoMode: process.env.NEXT_PUBLIC_DEMO_MODE,
  executionEnabled: process.env.NEXT_PUBLIC_TRANSACTION_EXECUTION_ENABLED,
  clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  rpc: {
    ethereum: process.env.NEXT_PUBLIC_RPC_URL_ETHEREUM,
    base: process.env.NEXT_PUBLIC_RPC_URL_BASE,
    arbitrum: process.env.NEXT_PUBLIC_RPC_URL_ARBITRUM,
    optimism: process.env.NEXT_PUBLIC_RPC_URL_OPTIMISM,
    polygon: process.env.NEXT_PUBLIC_RPC_URL_POLYGON,
  },
} as const

const isTrue = (value: string | undefined) => value === 'true' || value === '1'
const clean = (value: string | undefined) => (value && value.trim().length > 0 ? value.trim() : undefined)

export const publicConfig = {
  appUrl: clean(raw.appUrl) ?? 'https://zefi.ae',

  /** Falls back to the on-site product page when no separate deployment exists. */
  routefoldUrl: clean(raw.routefoldUrl) ?? '/products/routefold',
  routefoldIsExternal: Boolean(clean(raw.routefoldUrl)?.startsWith('http')),

  walletConnectProjectId: clean(raw.walletConnectProjectId),

  /**
   * Demo mode serves deterministic, explicitly-labelled fixtures so the product
   * can be demonstrated without credentials. It is a *deliberate* state, never a
   * silent fallback for a failed provider call.
   */
  demoMode: isTrue(raw.demoMode),

  /** Master switch for requesting wallet signatures. */
  executionEnabled: isTrue(raw.executionEnabled),

  authConfigured: Boolean(clean(raw.clerkPublishableKey)),

  rpcOverrides: {
    ethereum: clean(raw.rpc.ethereum),
    base: clean(raw.rpc.base),
    arbitrum: clean(raw.rpc.arbitrum),
    optimism: clean(raw.rpc.optimism),
    polygon: clean(raw.rpc.polygon),
  },
} as const

export type PublicConfig = typeof publicConfig
