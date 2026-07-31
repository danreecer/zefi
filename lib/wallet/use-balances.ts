'use client'

import { useQuery } from '@tanstack/react-query'

/**
 * Balance reads, as a query rather than an effect.
 *
 * React Query owns the loading, error and success states, which keeps the
 * three genuinely distinct: "reading", "read and empty", and "could not read"
 * never collapse into one another, and a failed read never renders as a zero.
 */

export interface BalanceReading {
  chainKey: string
  symbol: string
  amount: string
  decimals: number
  address: string | null
  readAt: string
}

export interface BalanceSnapshot {
  chainKey: string
  readAt: string
  native: BalanceReading | null
  tokens: BalanceReading[]
  errors: Array<{ chainKey: string; reason: string }>
}

export interface BalancesResult {
  address: string
  readAt: string
  snapshots: BalanceSnapshot[]
  errors: Array<{ chainKey: string; reason: string }>
  complete: boolean
}

export class BalanceReadError extends Error {}

async function fetchBalances(address: string, chains?: string[]): Promise<BalancesResult> {
  const params = new URLSearchParams({ address })
  if (chains?.length) params.set('chains', chains.join(','))

  const response = await fetch(`/api/wallet/balances?${params.toString()}`)
  const payload = await response.json().catch(() => null)

  if (!payload?.ok) {
    throw new BalanceReadError(
      payload?.error?.message ??
        'ZeFi could not reach its balance reader. No figures are shown rather than stale ones.',
    )
  }
  return payload.data as BalancesResult
}

export function useBalances(address: string | undefined, chains?: string[]) {
  return useQuery({
    queryKey: ['zefi', 'balances', address, chains?.join(',') ?? 'all'],
    queryFn: () => fetchBalances(address as string, chains),
    enabled: Boolean(address),
    // Balances go stale quickly; a figure older than this is refetched rather
    // than shown with a misleading timestamp.
    staleTime: 20_000,
    retry: 1,
  })
}
