import { encodeFunctionData, isAddress, type Address, type Hex } from 'viem'

import { ERC20_ABI, findToken, getChain } from '@/lib/chains/registry'
import { toBaseUnits, validateDecimalAmount } from '@/lib/security/validation'
import type { TransactionPlan } from './types'

/**
 * Turns a plan into the exact transaction a wallet will be asked to sign.
 *
 * This exists so that simulation and signature cannot disagree. Before it, the
 * approval flow resolved the recipient, decimals and amount inline; anything
 * simulating a plan would have had to re-derive them, and a simulation of a
 * *slightly different* transaction is worse than no simulation at all — it
 * attaches confidence to something that was never checked.
 *
 * Everything here comes from the chain registry and the plan's own decimal
 * strings. No model output reaches this module.
 */

export type TransferKind = 'native_transfer' | 'erc20_transfer'

export interface ResolvedTransfer {
  kind: TransferKind
  chainKey: string
  chainId: number
  /** Where the transaction is sent: the recipient, or the token contract. */
  to: Address
  /** Who ultimately receives the asset. Equals `to` for a native transfer. */
  recipient: Address
  /** Native value in wei. Zero for an ERC-20 transfer. */
  value: bigint
  /** Calldata for the transfer. `0x` for a native transfer. */
  data: Hex
  /** Set only for ERC-20, so callers can use `writeContract` with the registry ABI. */
  token: { address: Address; symbol: string; decimals: number } | null
  /** Base units of the asset being moved, native or ERC-20 alike. */
  amount: bigint
  /** The decimal string the amount was parsed from, for display. */
  amountText: string
  assetSymbol: string
}

export type ResolveResult =
  | { ok: true; transfer: ResolvedTransfer }
  | { ok: false; reason: string }

/**
 * Resolves the single signable action in a plan.
 *
 * Returns a reason rather than throwing, because every caller has somewhere
 * honest to put it: the approval flow shows it, the simulator records it as a
 * skipped check.
 */
export function resolveTransfer(plan: TransactionPlan): ResolveResult {
  const action = plan.actions.find((item) => item.executionMode === 'wallet_signature')
  if (!action) return { ok: false, reason: 'This plan has no step that a wallet can sign.' }

  const chain = getChain(action.chainKey)
  if (!chain) return { ok: false, reason: `“${action.chainKey}” is not in ZeFi's chain registry.` }
  if (chain.family !== 'evm' || !chain.chainId) {
    return { ok: false, reason: `${chain.name} is not an EVM network, so ZeFi cannot encode a transfer for it.` }
  }

  if (!action.recipient) return { ok: false, reason: 'This plan has no recipient address.' }
  if (!isAddress(action.recipient)) {
    return { ok: false, reason: `“${action.recipient}” is not a valid EVM address.` }
  }
  if (!action.amount) return { ok: false, reason: 'This plan has no amount.' }

  // The plan stores a human decimal string; strip grouping before parsing.
  const rawAmount = action.amount.replace(/,/g, '')
  const token = action.asset ? findToken(chain.key, action.asset) : null
  const recipient = action.recipient as Address

  const decimals = !token || token.kind === 'native' ? chain.nativeCurrency.decimals : token.decimals

  // Deliberately not viem's `parseUnits`: it *rounds* an amount carrying more
  // precision than the asset has decimals, so `1.1234567` USDC would silently
  // become `1.123457`. Sending a different number than the user asked for is
  // never the right recovery — refuse instead, and convert with BigInt only.
  const validated = validateDecimalAmount(rawAmount, decimals)
  if (!validated.ok) return { ok: false, reason: validated.reason }
  const amount = toBaseUnits(validated.normalised, decimals)
  const amountText = validated.normalised

  if (!token || token.kind === 'native') {
    return {
      ok: true,
      transfer: {
        kind: 'native_transfer',
        chainKey: chain.key,
        chainId: chain.chainId,
        to: recipient,
        recipient,
        value: amount,
        data: '0x',
        token: null,
        amount,
        amountText,
        assetSymbol: action.asset ?? chain.nativeCurrency.symbol,
      },
    }
  }

  if (!token.address || !isAddress(token.address)) {
    return { ok: false, reason: `${token.symbol} has no contract address in the registry for ${chain.name}.` }
  }

  return {
    ok: true,
    transfer: {
      kind: 'erc20_transfer',
      chainKey: chain.key,
      chainId: chain.chainId,
      to: token.address as Address,
      recipient,
      value: 0n,
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [recipient, amount],
      }),
      token: { address: token.address as Address, symbol: token.symbol, decimals: token.decimals },
      amount,
      amountText,
      assetSymbol: token.symbol,
    },
  }
}
