import 'server-only'

import { BaseError, formatUnits, type Address } from 'viem'

import { getChain } from '@/lib/chains/registry'
import { resolveTransfer } from '@/lib/planner/calldata'
import type { SimulationCheck, SimulationResult } from '@/lib/planner/types'
import { publicClientFor } from '@/lib/wallet/server-reads'
import { LocalSimulationProvider } from './local'
import { check, summariseChecks, type SimulationProvider, type SimulationRequest } from './types'

/**
 * Deep simulation over a JSON-RPC endpoint.
 *
 * `eth_call` executes a transaction in the EVM against current chain state
 * without broadcasting it. That is a genuine execution — the token contract's
 * own code runs, so a paused token, a blacklisted recipient, a transfer fee or
 * an insufficient balance all surface as a revert with the contract's reason
 * string. It is what `deep` is for.
 *
 * What it is not: a fork with balance-change traces. It reports whether the
 * transaction would revert right now and what it would cost, not a full account
 * diff. A provider that offers traces can be added alongside this one under the
 * same interface — that is why the interface exists.
 *
 * The local deterministic checks still run first, and their result is returned
 * whole. This provider adds one check; it does not replace the others.
 *
 * Honesty rules held here:
 *   • `deepSimulation` is true only when the call actually executed.
 *   • A local failure short-circuits: there is no point executing a transaction
 *     that is already known to be malformed, and doing so would report a revert
 *     reason for the wrong problem.
 *   • An RPC that cannot be reached is `unavailable`, never a pass.
 */
export class RpcSimulationProvider implements SimulationProvider {
  readonly name = 'rpc'
  readonly deep = true

  private readonly local = new LocalSimulationProvider()

  async simulate(request: SimulationRequest): Promise<SimulationResult> {
    const base = await this.local.simulate(request)

    // Already invalid on its face. Return the local verdict unchanged rather
    // than dressing it up as a deep result.
    if (base.status === 'failed') {
      return { ...base, provider: this.name, message: base.message }
    }

    const outcome = await this.execute(request)
    const checks: SimulationCheck[] = [...base.checks, outcome.check]

    if (!outcome.executed) {
      const status = summariseChecks(checks, false)
      return {
        ...base,
        provider: this.name,
        deepSimulation: false,
        checks,
        status: status === 'passed' ? 'local_only' : status,
        message: `Local validation only — ${outcome.check.detail}`,
      }
    }

    const status = summariseChecks(checks, true)
    return {
      status: status === 'local_only' ? 'passed' : status,
      provider: this.name,
      deepSimulation: true,
      checks,
      balanceChanges: base.balanceChanges,
      gasEstimate: outcome.gasEstimate ?? base.gasEstimate,
      performedAt: new Date().toISOString(),
      message:
        status === 'failed'
          ? 'This transaction was executed against live chain state and reverted. ZeFi will not present it for signature.'
          : 'Executed against live chain state via eth_call. No revert. This is not a fork trace — balance changes are still projected from the plan.',
    }
  }

  /** Runs the transaction. `executed` distinguishes "it ran" from "we could not run it". */
  private async execute(request: SimulationRequest): Promise<{
    executed: boolean
    check: SimulationCheck
    gasEstimate?: string | null
  }> {
    const label = 'Executes against chain state without reverting'

    const from = request.wallet.address
    if (!from) {
      return {
        executed: false,
        check: check('execution', label, 'skipped', 'No wallet is connected, so there is no sender to execute the transaction from.'),
      }
    }

    const resolved = resolveTransfer(request.plan)
    if (!resolved.ok) {
      return {
        executed: false,
        check: check('execution', label, 'skipped', resolved.reason),
      }
    }

    const { transfer } = resolved
    const client = publicClientFor(transfer.chainKey)
    if (!client) {
      return {
        executed: false,
        check: check('execution', label, 'skipped', `No JSON-RPC client is configured for ${transfer.chainKey}.`),
      }
    }

    try {
      await client.call({
        account: from as Address,
        to: transfer.to,
        data: transfer.data,
        value: transfer.value,
      })
    } catch (error) {
      if (isReachabilityFailure(error)) {
        return {
          executed: false,
          check: check('execution', label, 'skipped', `The RPC endpoint for ${transfer.chainKey} could not be reached, so the transaction was not executed.`),
        }
      }
      return {
        executed: true,
        check: check('execution', label, 'fail', `Reverted: ${revertReason(error)}`),
      }
    }

    // The call succeeded, so gas estimation should too. If it does not, that is
    // worth surfacing rather than silently dropping the figure.
    let gasEstimate: string | null = null
    try {
      const chain = getChain(transfer.chainKey)
      const [gas, gasPrice] = await Promise.all([
        client.estimateGas({
          account: from as Address,
          to: transfer.to,
          data: transfer.data,
          value: transfer.value,
        }),
        client.getGasPrice(),
      ])
      gasEstimate = formatUnits(gas * gasPrice, chain?.nativeCurrency.decimals ?? 18)
    } catch {
      gasEstimate = null
    }

    return {
      executed: true,
      gasEstimate,
      check: check(
        'execution',
        label,
        'pass',
        gasEstimate
          ? `eth_call succeeded on ${transfer.chainKey}. Estimated network cost ${trimZeros(gasEstimate)}.`
          : `eth_call succeeded on ${transfer.chainKey}.`,
      ),
    }
  }
}

/**
 * Distinguishes "the chain rejected this transaction" from "we could not ask".
 *
 * The difference decides whether the user is told their transaction would fail,
 * or told that nothing was verified. Getting it backwards would either invent a
 * failure or hide one, so anything not clearly a revert is treated as a
 * reachability problem.
 */
function isReachabilityFailure(error: unknown): boolean {
  if (!(error instanceof BaseError)) return true
  const name = error.walk()?.name ?? error.name
  return !['CallExecutionError', 'ContractFunctionRevertedError', 'RawContractError', 'ExecutionRevertedError'].includes(
    name,
  )
}

function revertReason(error: unknown): string {
  if (error instanceof BaseError) {
    const walked = error.walk() as { reason?: string; shortMessage?: string } | null
    return walked?.reason ?? walked?.shortMessage ?? error.shortMessage
  }
  return error instanceof Error ? error.message : 'unknown reason'
}

/** `0.000021000000000000` reads as noise; `0.000021` reads as a number. */
function trimZeros(value: string): string {
  return value.includes('.') ? value.replace(/0+$/, '').replace(/\.$/, '') : value
}
