import 'server-only'

import { serverEnv } from '@/lib/config/env'

/**
 * External provider adapters.
 *
 * ZeFi's execution surface is deliberately narrow: native and ERC-20 transfers,
 * built from the chain registry, signed by the user's own wallet. Everything
 * wider than that — swap routing, bridge routing, portfolio pricing — sits
 * behind one of these interfaces so a vendor can be added without touching the
 * planner, the AI layer, or the UI.
 *
 * The pattern each adapter follows:
 *   • `available()` reports the truth about configuration
 *   • an unconfigured provider returns a typed `unavailable` result
 *   • a *failed* provider throws, and the caller surfaces the failure
 *
 * Nothing in this module fabricates a quote.
 */

export class ProviderUnavailableError extends Error {
  constructor(
    public readonly provider: string,
    public readonly envVar: string,
  ) {
    super(
      `${provider} is not configured. Set ${envVar} to enable it. ZeFi will plan the step and describe it, but will not produce a quote or calldata without it.`,
    )
    this.name = 'ProviderUnavailableError'
  }
}

export interface RouteQuote {
  provider: string
  /** Decimal string of the destination asset. */
  expectedOutput: string
  minimumOutput: string
  estimatedSeconds: number
  networkCostNative: string
  networkCostUsd: number | null
  /** The contract that must be approved, checksummed, from the provider. */
  spenderAddress: string | null
  /** Human-readable route steps, e.g. ["Uniswap v3", "Across"]. */
  hops: string[]
  /** When the quote was produced. Quotes go stale in seconds. */
  quotedAt: string
  expiresAt: string
}

export interface SwapQuoteRequest {
  chainKey: string
  fromSymbol: string
  toSymbol: string
  amount: string
  slippagePercent: number
  takerAddress: string
}

export interface BridgeQuoteRequest {
  fromChainKey: string
  toChainKey: string
  symbol: string
  amount: string
  takerAddress: string
  recipientAddress: string
  priority: 'safest' | 'cheapest' | 'fastest' | 'balanced'
}

export interface SwapProvider {
  readonly name: string
  quote(request: SwapQuoteRequest): Promise<RouteQuote>
}

export interface BridgeProvider {
  readonly name: string
  /** Multiple routes so ZeFi can present a real comparison rather than one option. */
  quote(request: BridgeQuoteRequest): Promise<RouteQuote[]>
}

export interface PortfolioPosition {
  chainKey: string
  symbol: string
  amount: string
  decimals: number
  address: string | null
  priceUsd: number | null
  valueUsd: number | null
}

export interface PortfolioProvider {
  readonly name: string
  positions(address: string, chainKeys: string[]): Promise<PortfolioPosition[]>
  /** ISO timestamp of the underlying data, so the UI can show freshness. */
  readonly cadence: string
}

/* ── Resolution ────────────────────────────────────────────────────────────── */

const SWAP_ADAPTERS: Record<string, () => SwapProvider> = {}
const BRIDGE_ADAPTERS: Record<string, () => BridgeProvider> = {}
const PORTFOLIO_ADAPTERS: Record<string, () => PortfolioProvider> = {}

export function getSwapProvider(): SwapProvider | null {
  const name = serverEnv.providers.swap
  if (!name) return null
  const factory = SWAP_ADAPTERS[name]
  if (!factory) {
    throw new Error(
      `SWAP_PROVIDER is set to “${name}”, which this build does not implement. Register an adapter in lib/providers, or unset the variable.`,
    )
  }
  return factory()
}

export function getBridgeProvider(): BridgeProvider | null {
  const name = serverEnv.providers.bridge
  if (!name) return null
  const factory = BRIDGE_ADAPTERS[name]
  if (!factory) {
    throw new Error(
      `BRIDGE_PROVIDER is set to “${name}”, which this build does not implement. Register an adapter in lib/providers, or unset the variable.`,
    )
  }
  return factory()
}

export function getPortfolioProvider(): PortfolioProvider | null {
  const name = serverEnv.providers.portfolio
  if (!name) return null
  const factory = PORTFOLIO_ADAPTERS[name]
  if (!factory) {
    throw new Error(
      `PORTFOLIO_PROVIDER is set to “${name}”, which this build does not implement. Register an adapter in lib/providers, or unset the variable.`,
    )
  }
  return factory()
}

export const providerStatus = () => ({
  swap: serverEnv.providers.swap ?? null,
  bridge: serverEnv.providers.bridge ?? null,
  portfolio: serverEnv.providers.portfolio ?? null,
  simulation: serverEnv.providers.simulation ?? null,
})
