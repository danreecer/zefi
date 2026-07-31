import 'server-only'

import { createPublicClient, http, type Address, type PublicClient } from 'viem'
import { arbitrum, base, mainnet, optimism, polygon } from 'viem/chains'

import { ERC20_ABI, getChain, getTokensForChain } from '@/lib/chains/registry'
import { serverEnv } from '@/lib/config/env'
import { fromBaseUnits } from '@/lib/security/validation'
import type { TokenBalanceReading } from '@/lib/simulation/types'

/**
 * Read-only chain access.
 *
 * All wallet reads happen on the server, against operator-configured RPC
 * endpoints. Nothing here can write: there is no wallet client, no private key,
 * and no signing path. Transaction signing happens exclusively in the user's own
 * wallet, in the browser.
 *
 * Every reading carries the timestamp it was taken at, because a balance without
 * a time is a balance you cannot reason about.
 */

const VIEM_CHAINS = { ethereum: mainnet, base, arbitrum, optimism, polygon } as const

type SupportedKey = keyof typeof VIEM_CHAINS

function rpcUrl(key: SupportedKey): string | undefined {
  return serverEnv.rpc[key]
}

const clients = new Map<string, PublicClient>()

export function publicClientFor(chainKey: string): PublicClient | null {
  if (!(chainKey in VIEM_CHAINS)) return null
  const key = chainKey as SupportedKey
  const existing = clients.get(key)
  if (existing) return existing

  const client = createPublicClient({
    chain: VIEM_CHAINS[key],
    // Falls back to the chain's public endpoint when no dedicated URL is set.
    // Public endpoints rate limit aggressively; DEPLOYMENT.md says so plainly.
    transport: http(rpcUrl(key), { timeout: 12_000, retryCount: 1 }),
  }) as PublicClient

  clients.set(key, client)
  return client
}

export class ChainReadError extends Error {
  constructor(
    public readonly chainKey: string,
    message: string,
  ) {
    super(message)
    this.name = 'ChainReadError'
  }
}

export interface WalletSnapshot {
  address: string
  chainKey: string
  readAt: string
  native: TokenBalanceReading | null
  tokens: TokenBalanceReading[]
  /** Chains that could not be read, with the reason. Never silently dropped. */
  errors: Array<{ chainKey: string; reason: string }>
}

/**
 * Reads native and registry-token balances for one address on one chain.
 * A failed read is reported as an error, never as a zero balance.
 */
export async function readChainBalances(address: string, chainKey: string): Promise<WalletSnapshot> {
  const readAt = new Date().toISOString()
  const chain = getChain(chainKey)
  const client = publicClientFor(chainKey)

  if (!chain || !client) {
    return {
      address,
      chainKey,
      readAt,
      native: null,
      tokens: [],
      errors: [{ chainKey, reason: `${chainKey} is not an EVM network ZeFi can read.` }],
    }
  }

  const errors: WalletSnapshot['errors'] = []
  let native: TokenBalanceReading | null = null

  try {
    const balance = await client.getBalance({ address: address as Address })
    native = {
      chainKey,
      symbol: chain.nativeCurrency.symbol,
      amount: fromBaseUnits(balance, chain.nativeCurrency.decimals),
      decimals: chain.nativeCurrency.decimals,
      address: null,
      readAt,
    }
  } catch (error) {
    errors.push({
      chainKey,
      reason: `Native balance read failed: ${error instanceof Error ? error.message : 'unknown error'}`,
    })
  }

  const erc20s = getTokensForChain(chainKey).filter((token) => token.address !== null)
  const tokens: TokenBalanceReading[] = []

  if (erc20s.length > 0) {
    try {
      const results = await client.multicall({
        allowFailure: true,
        contracts: erc20s.map((token) => ({
          address: token.address as Address,
          abi: ERC20_ABI,
          functionName: 'balanceOf' as const,
          args: [address as Address],
        })),
      })

      results.forEach((result, index) => {
        const token = erc20s[index]
        if (!token) return
        if (result.status !== 'success') {
          errors.push({ chainKey, reason: `${token.symbol} balance read failed on ${chain.name}.` })
          return
        }
        const value = result.result as bigint
        if (value === 0n) return
        tokens.push({
          chainKey,
          symbol: token.symbol,
          amount: fromBaseUnits(value, token.decimals),
          decimals: token.decimals,
          address: token.address,
          readAt,
        })
      })
    } catch (error) {
      errors.push({
        chainKey,
        reason: `Token balance reads failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      })
    }
  }

  return { address, chainKey, readAt, native, tokens, errors }
}

/** Reads several chains concurrently. Partial failure is reported, not hidden. */
export async function readWalletAcrossChains(
  address: string,
  chainKeys: string[],
): Promise<{ snapshots: WalletSnapshot[]; readAt: string; errors: WalletSnapshot['errors'] }> {
  const readAt = new Date().toISOString()
  const settled = await Promise.allSettled(chainKeys.map((key) => readChainBalances(address, key)))

  const snapshots: WalletSnapshot[] = []
  const errors: WalletSnapshot['errors'] = []

  settled.forEach((result, index) => {
    const chainKey = chainKeys[index] ?? 'unknown'
    if (result.status === 'fulfilled') {
      snapshots.push(result.value)
      errors.push(...result.value.errors)
    } else {
      errors.push({
        chainKey,
        reason: result.reason instanceof Error ? result.reason.message : 'Chain read rejected.',
      })
    }
  })

  return { snapshots, readAt, errors }
}

/** Flattens snapshots into the shape the simulation layer consumes. */
export function toBalanceReadings(snapshots: WalletSnapshot[]): TokenBalanceReading[] {
  return snapshots.flatMap((snapshot) => [
    ...(snapshot.native ? [snapshot.native] : []),
    ...snapshot.tokens,
  ])
}

/** A real `eth_estimateGas` for a native transfer, priced in native units. */
export async function estimateNativeTransferCost(
  chainKey: string,
  from: string,
  to: string,
  valueWei: bigint,
): Promise<{ gasNative: string; gasUnits: bigint } | null> {
  const client = publicClientFor(chainKey)
  const chain = getChain(chainKey)
  if (!client || !chain) return null

  try {
    const [gasUnits, fees] = await Promise.all([
      client.estimateGas({ account: from as Address, to: to as Address, value: valueWei }),
      client.estimateFeesPerGas(),
    ])
    const perGas = fees.maxFeePerGas ?? fees.gasPrice ?? 0n
    if (perGas === 0n) return null
    return {
      gasUnits,
      gasNative: fromBaseUnits(gasUnits * perGas, chain.nativeCurrency.decimals),
    }
  } catch {
    // A failed estimate is an absent estimate. The plan will say so.
    return null
  }
}
