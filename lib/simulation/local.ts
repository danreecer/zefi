import { findToken, getChain } from '@/lib/chains/registry'
import type { BalanceChange, SimulationCheck, SimulationResult } from '@/lib/planner/types'
import {
  isPlausibleSolanaAddress,
  validateDecimalAmount,
  validateEvmAddress,
} from '@/lib/security/validation'
import { check, summariseChecks, type SimulationProvider, type SimulationRequest } from './types'

/**
 * The local simulation provider.
 *
 * Everything here can be proved without a network call, and nothing here is
 * described as more than it is. `deep` is permanently false: this provider
 * validates a plan, it does not execute it against chain state.
 *
 * When a check cannot be performed — usually because a real balance reading is
 * absent — the outcome is `skipped`, never `pass`. A check that did not run is
 * not a check that succeeded.
 */
export class LocalSimulationProvider implements SimulationProvider {
  readonly name = 'local'
  readonly deep = false

  async simulate(request: SimulationRequest): Promise<SimulationResult> {
    const { plan, wallet, balances } = request
    const checks: SimulationCheck[] = []
    const balanceChanges: BalanceChange[] = []

    const sourceChainKey = plan.actions[0]?.chainKey ?? plan.intent.sourceNetwork
    const chain = getChain(sourceChainKey)

    /* ── Chain ──────────────────────────────────────────────────────────── */
    if (!chain) {
      checks.push(check('chain', 'Chain resolves to a supported network', 'fail', `“${sourceChainKey}” is not in ZeFi's chain registry.`))
    } else if (chain.capability === 'plan-only') {
      checks.push(
        check(
          'chain',
          'Chain resolves to a supported network',
          'warn',
          `${chain.name} is recognised for planning but ZeFi holds no wallet connection there, so no transaction can originate from it.`,
        ),
      )
    } else {
      checks.push(check('chain', 'Chain resolves to a supported network', 'pass', `${chain.name} · chain id ${chain.chainId}.`))
    }

    /* ── Wallet / network agreement ─────────────────────────────────────── */
    if (!wallet.address) {
      checks.push(check('wallet', 'Wallet connected', 'skipped', 'No wallet is connected, so ZeFi cannot check balances or nonce state.'))
    } else if (chain?.chainId && wallet.chainId && chain.chainId !== wallet.chainId) {
      checks.push(
        check(
          'wallet',
          'Wallet is on the plan’s network',
          'warn',
          `Wallet is on chain id ${wallet.chainId}; this plan targets ${chain.name} (${chain.chainId}). A network switch will be requested before signing.`,
        ),
      )
    } else {
      checks.push(check('wallet', 'Wallet is on the plan’s network', 'pass', 'Connected wallet matches the plan’s network.'))
    }

    /* ── Recipient ──────────────────────────────────────────────────────── */
    const recipient = plan.actions.find((action) => action.recipient)?.recipient ?? null
    if (!recipient) {
      checks.push(check('recipient', 'Recipient address', 'skipped', 'This plan has no explicit recipient.'))
    } else if (chain?.family === 'svm') {
      const ok = isPlausibleSolanaAddress(recipient)
      checks.push(
        check(
          'recipient',
          'Recipient address',
          ok ? 'warn' : 'fail',
          ok
            ? 'Address has a valid Solana shape. ZeFi cannot verify it further without a Solana connection — confirm it independently.'
            : 'Address is not a valid Solana address.',
        ),
      )
    } else {
      const result = validateEvmAddress(recipient, { self: wallet.address })
      checks.push(
        check(
          'recipient',
          'Recipient address',
          result.ok ? 'pass' : 'fail',
          result.ok ? `Checksum valid · ${result.checksummed}` : result.reason,
        ),
      )
    }

    /* ── Asset & decimals ───────────────────────────────────────────────── */
    const assetSymbol = plan.actions.find((action) => action.asset)?.asset ?? null
    const token = chain && assetSymbol ? findToken(chain.key, assetSymbol) : null
    if (!assetSymbol) {
      checks.push(check('asset', 'Asset resolves in the registry', 'skipped', 'This plan does not move a specific asset.'))
    } else if (!token) {
      checks.push(
        check('asset', 'Asset resolves in the registry', 'fail', `${assetSymbol} is not in ZeFi's verified registry for ${chain?.name ?? 'this chain'}.`),
      )
    } else {
      checks.push(
        check(
          'asset',
          'Asset resolves in the registry',
          'pass',
          `${token.symbol} · ${token.decimals} decimals · ${token.address ?? 'native currency'}`,
        ),
      )
    }

    /* ── Amount ─────────────────────────────────────────────────────────── */
    const amountValue = plan.intent.amount
    if (!amountValue) {
      checks.push(check('amount', 'Amount is representable', 'skipped', 'No amount is attached to this plan.'))
    } else if (amountValue.unit !== 'token') {
      checks.push(
        check(
          'amount',
          'Amount is representable',
          'warn',
          `Amount is expressed as ${amountValue.unit === 'usd' ? 'a US-dollar value' : amountValue.unit === 'percent' ? 'a percentage' : 'the full balance'}, which resolves to an exact token amount only at signing time.`,
        ),
      )
    } else if (token) {
      const result = validateDecimalAmount(amountValue.value, token.decimals)
      checks.push(
        check(
          'amount',
          'Amount is representable',
          result.ok ? 'pass' : 'fail',
          result.ok ? `${result.normalised} ${token.symbol} encodes exactly at ${token.decimals} decimals.` : result.reason,
        ),
      )
    } else {
      checks.push(check('amount', 'Amount is representable', 'skipped', 'Asset is unresolved, so decimals cannot be checked.'))
    }

    /* ── Balance ────────────────────────────────────────────────────────── */
    const reading = balances?.find(
      (balance) => balance.chainKey === chain?.key && balance.symbol === token?.symbol,
    )
    if (!reading) {
      checks.push(
        check(
          'balance',
          'Balance covers the amount',
          'skipped',
          'No live balance reading is available, so ZeFi has not verified that this amount is spendable.',
        ),
      )
    } else if (amountValue?.unit === 'token') {
      const sufficient = compareDecimalStrings(reading.amount, amountValue.value) >= 0
      checks.push(
        check(
          'balance',
          'Balance covers the amount',
          sufficient ? 'pass' : 'fail',
          sufficient
            ? `Balance ${reading.amount} ${reading.symbol}, read ${reading.readAt}.`
            : `Balance is ${reading.amount} ${reading.symbol}; this plan needs ${amountValue.value}.`,
        ),
      )
      balanceChanges.push({
        chainKey: reading.chainKey,
        asset: reading.symbol,
        direction: 'decrease',
        amount: amountValue.value,
        projected: true,
      })
    } else {
      checks.push(check('balance', 'Balance covers the amount', 'skipped', 'Amount is not a fixed token quantity.'))
    }

    /* ── Approvals ──────────────────────────────────────────────────────── */
    const unlimited = plan.approvals.filter((approval) => approval.unlimited)
    if (plan.approvals.length === 0) {
      checks.push(check('approvals', 'No unlimited approvals', 'pass', 'This plan requests no token approvals.'))
    } else if (unlimited.length > 0) {
      checks.push(
        check(
          'approvals',
          'No unlimited approvals',
          'fail',
          `${unlimited.length} unlimited approval${unlimited.length === 1 ? '' : 's'} detected. ZeFi will not present an unlimited approval for signature.`,
        ),
      )
    } else {
      checks.push(
        check(
          'approvals',
          'No unlimited approvals',
          'pass',
          `${plan.approvals.length} exact-amount approval${plan.approvals.length === 1 ? '' : 's'}.`,
        ),
      )
    }

    /* ── Buildability ───────────────────────────────────────────────────── */
    const providerRequired = plan.actions.filter((action) => action.executionMode === 'provider_required')
    if (providerRequired.length > 0) {
      checks.push(
        check(
          'calldata',
          'Every step can be encoded',
          'warn',
          `${providerRequired.length} step${providerRequired.length === 1 ? '' : 's'} need a routing provider before calldata can be produced.`,
        ),
      )
    } else if (plan.actions.length > 0) {
      checks.push(check('calldata', 'Every step can be encoded', 'pass', 'All steps map to a known function on a registry contract.'))
    } else {
      checks.push(check('calldata', 'Every step can be encoded', 'skipped', 'This plan contains no executable steps.'))
    }

    const status = summariseChecks(checks, this.deep)

    return {
      status,
      provider: this.name,
      deepSimulation: false,
      checks,
      balanceChanges,
      gasEstimate: plan.estimates.networkCostNative,
      performedAt: new Date().toISOString(),
      message:
        status === 'failed'
          ? 'Local validation failed. ZeFi will not present this plan for signature as written.'
          : 'Local deterministic validation only. ZeFi has not executed this transaction against chain state.',
    }
  }
}

/** Compares two positive decimal strings without going through a float. */
export function compareDecimalStrings(a: string, b: string): number {
  const [aWhole = '0', aFraction = ''] = a.split('.')
  const [bWhole = '0', bFraction = ''] = b.split('.')
  const width = Math.max(aFraction.length, bFraction.length)
  const left = BigInt(aWhole) * 10n ** BigInt(width) + BigInt(aFraction.padEnd(width, '0') || '0')
  const right = BigInt(bWhole) * 10n ** BigInt(width) + BigInt(bFraction.padEnd(width, '0') || '0')
  return left === right ? 0 : left > right ? 1 : -1
}
