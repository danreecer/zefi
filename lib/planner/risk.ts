import { getChain } from '@/lib/chains/registry'
import type { ResolvedIntent } from '@/lib/intent/schema'
import type { ApprovalRequirement, PlanAction, RiskFinding } from './types'

/**
 * The risk engine.
 *
 * Every finding here is derived deterministically from the plan itself. None of
 * it comes from the model. The model is later asked to *explain* these findings
 * in plain language, but it cannot add, remove or downgrade one.
 */

export interface RiskContext {
  resolved: ResolvedIntent
  actions: PlanAction[]
  approvals: ApprovalRequirement[]
  /** Native balance on the source chain, decimal string, when known. */
  nativeBalance: string | null
  executionEnabled: boolean
  deepSimulationAvailable: boolean
  /** Addresses this user has transacted with before. */
  knownRecipients: string[]
}

/** Native currency left behind for future gas, per chain, as a decimal string. */
const GAS_RESERVE: Record<string, number> = {
  ethereum: 0.01,
  base: 0.001,
  arbitrum: 0.001,
  optimism: 0.001,
  polygon: 0.5,
}

export function assessRisk(context: RiskContext): RiskFinding[] {
  const findings: RiskFinding[] = []
  const { resolved, actions, approvals } = context
  const intent = resolved.intent
  const sourceChain = getChain(resolved.sourceChainKey)

  /* ── Approvals ─────────────────────────────────────────────────────────── */

  for (const approval of approvals) {
    if (approval.unlimited) {
      findings.push({
        code: 'UNLIMITED_APPROVAL',
        severity: 'critical',
        title: 'Unlimited spending approval requested',
        detail: `This plan would let ${approval.spenderLabel} move an unlimited amount of your ${approval.asset} on ${getChain(approval.chainKey)?.name ?? approval.chainKey}, for as long as the approval stands. ZeFi recommends approving only the amount this plan needs, and revoking it afterwards.`,
      })
    } else {
      findings.push({
        code: 'TOKEN_APPROVAL',
        severity: 'caution',
        title: 'Token approval required before the main action',
        detail: `Before the transfer can run, ${approval.spenderLabel} must be approved to move ${approval.amount ? `${approval.amount} ` : ''}${approval.asset}. This is a separate transaction you will sign first.`,
      })
    }
  }

  /* ── Recipient ─────────────────────────────────────────────────────────── */

  if (resolved.recipientAddress) {
    const known = context.knownRecipients.some(
      (address) => address.toLowerCase() === resolved.recipientAddress?.toLowerCase(),
    )
    if (!known) {
      findings.push({
        code: 'NEW_RECIPIENT',
        severity: 'caution',
        title: 'First transfer to this address',
        detail:
          'ZeFi has no record of you sending to this address before. Transfers are irreversible — check the full address against a source you trust, not just the first and last four characters.',
      })
    }
    findings.push({
      code: 'RECIPIENT_TYPE_UNVERIFIED',
      severity: 'info',
      title: 'Recipient type not yet verified',
      detail: context.deepSimulationAvailable
        ? 'Simulation will report whether this address is a contract or an externally-owned account.'
        : 'ZeFi cannot tell offline whether this address is a contract or a regular wallet. Sending tokens to a contract that does not expect them can make them unrecoverable.',
    })
  }

  /* ── Cross-chain ───────────────────────────────────────────────────────── */

  if (intent.intentType === 'BRIDGE' && resolved.destinationChainKey) {
    const destination = getChain(resolved.destinationChainKey)
    findings.push({
      code: 'BRIDGE_TRUST_ASSUMPTION',
      severity: 'caution',
      title: 'Bridging adds a trust assumption',
      detail: `Moving value to ${destination?.name ?? resolved.destinationChainKey} means relying on a bridge's validators or its liquidity network for the period the funds are in transit. That is a different risk from a transfer inside one chain, and it does not disappear once the transaction confirms on the source chain.`,
    })

    if (destination?.family === 'svm' || sourceChain?.family === 'svm') {
      findings.push({
        code: 'CROSS_VM_ROUTE',
        severity: 'caution',
        title: 'Route crosses virtual machines',
        detail:
          'This route moves between an EVM chain and Solana. The destination address format differs, and an address that is valid on one side is not valid on the other. ZeFi will require the destination address to be confirmed separately.',
      })
    }
  }

  /* ── Gas reserve ───────────────────────────────────────────────────────── */

  if (sourceChain && context.nativeBalance !== null) {
    const balance = Number(context.nativeBalance)
    const reserve = GAS_RESERVE[sourceChain.key] ?? 0.005
    const movingNative =
      resolved.sourceTokenSymbol === sourceChain.nativeCurrency.symbol && intent.amount?.unit === 'token'
    const amount = movingNative ? Number(intent.amount?.value ?? '0') : 0

    if (Number.isFinite(balance) && balance - amount < reserve) {
      findings.push({
        code: 'GAS_RESERVE_LOW',
        severity: 'caution',
        title: `Low ${sourceChain.nativeCurrency.symbol} left for gas`,
        detail: `After this action you would hold roughly ${(balance - amount).toFixed(6)} ${sourceChain.nativeCurrency.symbol} on ${sourceChain.name}. ZeFi suggests keeping at least ${reserve} ${sourceChain.nativeCurrency.symbol} so you can still pay for future transactions — including one to move these funds back.`,
      })
    }
  }

  /* ── Slippage ──────────────────────────────────────────────────────────── */

  const slippage = intent.slippageTolerancePercent
  if (slippage !== null && slippage >= 3) {
    findings.push({
      code: 'HIGH_SLIPPAGE',
      severity: slippage >= 10 ? 'critical' : 'caution',
      title: `Slippage tolerance set to ${slippage}%`,
      detail: `A ${slippage}% tolerance means you would accept receiving up to ${slippage}% less than quoted. On a thin market that gap is what a sandwich attack takes.`,
    })
  }

  /* ── Capability honesty ────────────────────────────────────────────────── */

  const providerRequired = actions.filter((action) => action.executionMode === 'provider_required')
  if (providerRequired.length > 0) {
    findings.push({
      code: 'PROVIDER_INTEGRATION_REQUIRED',
      severity: 'info',
      title: `${providerRequired.length} step${providerRequired.length === 1 ? '' : 's'} need a routing provider`,
      detail: `ZeFi has planned ${providerRequired.length === 1 ? 'this step' : 'these steps'} but cannot build the calldata without a swap or bridge provider configured. Nothing will be submitted for signature: ${providerRequired.map((action) => action.title).join('; ')}.`,
    })
  }

  if (!context.executionEnabled && actions.some((a) => a.executionMode === 'wallet_signature')) {
    findings.push({
      code: 'EXECUTION_DISABLED',
      severity: 'info',
      title: 'Execution is switched off in this deployment',
      detail:
        'TRANSACTION_EXECUTION_ENABLED is false, so ZeFi will build and simulate this plan but will not request a wallet signature.',
    })
  }

  if (!context.deepSimulationAvailable) {
    findings.push({
      code: 'DEEP_SIMULATION_UNAVAILABLE',
      severity: 'info',
      title: 'Deep simulation is not configured',
      detail:
        'ZeFi has run its local deterministic checks — address, chain, asset, decimals and balance arithmetic. It has not executed this transaction against forked chain state, so it cannot promise the transaction will not revert.',
    })
  }

  /* ── Blockers surfaced as risk ─────────────────────────────────────────── */

  for (const blocker of resolved.blockers) {
    findings.push({
      code: 'VALIDATION_BLOCKER',
      severity: 'critical',
      title: 'Validation stopped this plan',
      detail: blocker,
    })
  }

  return dedupe(findings)
}

const SEVERITY_ORDER: Record<RiskFinding['severity'], number> = { critical: 0, caution: 1, info: 2 }

export function sortRisks(risks: RiskFinding[]): RiskFinding[] {
  return [...risks].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
}

export function highestSeverity(risks: RiskFinding[]): RiskFinding['severity'] | null {
  if (risks.length === 0) return null
  return sortRisks(risks)[0]?.severity ?? null
}

function dedupe(findings: RiskFinding[]): RiskFinding[] {
  const seen = new Set<string>()
  const out: RiskFinding[] = []
  for (const finding of sortRisks(findings)) {
    const key = `${finding.code}:${finding.title}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(finding)
  }
  return out
}
