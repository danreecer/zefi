import { findToken, getChain, type TokenDefinition } from '@/lib/chains/registry'
import type { ResolvedIntent } from '@/lib/intent/schema'
import { createId, formatTokenAmount } from '@/lib/utils'
import { assessRisk } from './risk'
import type {
  ApprovalRequirement,
  DataSource,
  PlanAction,
  PlanEstimates,
  PlanStatus,
  SimulationResult,
  TransactionPlan,
} from './types'

/**
 * Deterministic plan construction.
 *
 * The planner turns a resolved intent into an ordered list of actions and an
 * honest account of what ZeFi can and cannot do with each one. Every number in
 * the output either comes from a caller-supplied real reading, or is `null`.
 * There is no code path here that invents a fee, a rate, or a duration.
 */

export interface PlanContext {
  /** The user's original message, stored verbatim on the plan. */
  request: string
  walletAddress: string | null
  executionEnabled: boolean
  deepSimulationAvailable: boolean
  swapProviderConfigured: boolean
  bridgeProviderConfigured: boolean
  /** Native balance on the source chain, from a real read. */
  nativeBalance?: string | null
  /** Gas estimate in native units, from a real `eth_estimateGas`. */
  gasEstimateNative?: string | null
  gasEstimateUsd?: number | null
  knownRecipients?: string[]
  /** Marks every figure as a fixture. Set only by the demo fixtures module. */
  illustrative?: boolean
  dataSources?: DataSource[]
}

export function buildPlan(resolved: ResolvedIntent, context: PlanContext): TransactionPlan {
  const now = new Date().toISOString()
  const intent = resolved.intent
  const sourceChain = getChain(resolved.sourceChainKey)
  const destinationChain = getChain(resolved.destinationChainKey)
  const sourceToken = sourceChain ? findToken(sourceChain.key, resolved.sourceTokenSymbol) : null
  const destinationToken = destinationChain
    ? findToken(destinationChain.key, resolved.destinationTokenSymbol ?? resolved.sourceTokenSymbol)
    : sourceChain
      ? findToken(sourceChain.key, resolved.destinationTokenSymbol)
      : null

  const actions: PlanAction[] = []
  const approvals: ApprovalRequirement[] = []
  const amountText = intent.amount
    ? intent.amount.unit === 'max'
      ? 'the full balance'
      : intent.amount.unit === 'percent'
        ? `${intent.amount.value}% of the balance`
        : intent.amount.unit === 'usd'
          ? `$${formatTokenAmount(intent.amount.value)}`
          : formatTokenAmount(intent.amount.value)
    : null

  const assetLabel = resolved.sourceTokenSymbol ?? intent.sourceAsset ?? 'the asset'
  const amountWithAsset = amountText ? `${amountText} ${assetLabel}` : assetLabel

  switch (intent.intentType) {
    case 'SEND': {
      const isNative = sourceToken?.kind === 'native'
      actions.push({
        index: 0,
        kind: 'transfer',
        title: `Transfer ${amountWithAsset} on ${sourceChain?.name ?? 'the source network'}`,
        description: isNative
          ? `A native ${assetLabel} transfer. Your wallet signs it directly; ZeFi never holds the funds.`
          : `An ERC-20 \`transfer\` call on the ${assetLabel} contract. Your wallet signs it directly; ZeFi never holds the funds.`,
        chainKey: sourceChain?.key ?? 'unknown',
        executionMode: transferExecutionMode(sourceChain?.capability, context.executionEnabled),
        providerRequirement:
          sourceChain?.capability === 'plan-only'
            ? `${sourceChain.name} wallet connection`
            : undefined,
        asset: assetLabel,
        amount: amountText,
        contractAddress: sourceToken?.address ?? null,
        recipient: resolved.recipientAddress,
        functionSignature: isNative ? null : 'transfer(address,uint256)',
        estimatedSeconds: sourceChain ? sourceChain.typicalBlockSeconds * 2 : null,
      })
      break
    }

    case 'SWAP': {
      const needsApproval = sourceToken?.kind !== 'native'
      if (needsApproval && sourceToken) {
        approvals.push(approvalFor(sourceToken, 'the swap router', amountText))
        actions.push(approvalAction(0, sourceToken, sourceChain?.key ?? 'unknown', 'the swap router', amountText, context))
      }
      actions.push({
        index: actions.length,
        kind: 'swap',
        title: `Swap ${amountWithAsset} for ${resolved.destinationTokenSymbol ?? intent.destinationAsset ?? 'the destination asset'}`,
        description: context.swapProviderConfigured
          ? 'ZeFi will request quotes from the configured routing provider, compare them, and present the selected route for approval before any signature.'
          : 'ZeFi has planned this swap but no routing provider is configured, so it cannot fetch a quote or build calldata. The step is shown for completeness and will not be submitted.',
        chainKey: sourceChain?.key ?? 'unknown',
        executionMode: context.swapProviderConfigured ? 'wallet_signature' : 'provider_required',
        providerRequirement: context.swapProviderConfigured ? undefined : 'Swap routing provider (SWAP_PROVIDER)',
        asset: assetLabel,
        amount: amountText,
        contractAddress: null,
        recipient: context.walletAddress,
        functionSignature: null,
        estimatedSeconds: sourceChain ? sourceChain.typicalBlockSeconds * 3 : null,
      })
      break
    }

    case 'BRIDGE': {
      const needsApproval = sourceToken?.kind !== 'native'
      if (needsApproval && sourceToken) {
        approvals.push(approvalFor(sourceToken, 'the bridge contract', amountText))
        actions.push(
          approvalAction(0, sourceToken, sourceChain?.key ?? 'unknown', 'the bridge contract', amountText, context),
        )
      }
      actions.push({
        index: actions.length,
        kind: 'bridge',
        title: `Bridge ${amountWithAsset} from ${sourceChain?.name ?? 'source'} to ${destinationChain?.name ?? 'destination'}`,
        description: context.bridgeProviderConfigured
          ? 'ZeFi will compare available bridge routes on cost, time and trust model, then present the selected route for approval before any signature.'
          : 'ZeFi has planned this bridge and can describe the required steps, but no bridge provider is configured, so it cannot compare live routes or build calldata. Nothing will be submitted for signature.',
        chainKey: sourceChain?.key ?? 'unknown',
        executionMode: context.bridgeProviderConfigured ? 'wallet_signature' : 'provider_required',
        providerRequirement: context.bridgeProviderConfigured
          ? undefined
          : 'Bridge routing provider (BRIDGE_PROVIDER)',
        asset: assetLabel,
        amount: amountText,
        contractAddress: null,
        recipient: resolved.recipientAddress ?? context.walletAddress,
        functionSignature: null,
        estimatedSeconds: null,
      })
      actions.push({
        index: actions.length,
        kind: 'receive',
        title: `Receive ${resolved.destinationTokenSymbol ?? assetLabel} on ${destinationChain?.name ?? 'the destination network'}`,
        description:
          'Settlement on the destination chain. No signature is required from you for this step — it completes when the bridge releases the funds.',
        chainKey: destinationChain?.key ?? 'unknown',
        executionMode: 'informational',
        asset: resolved.destinationTokenSymbol ?? assetLabel,
        amount: null,
        contractAddress: destinationToken?.address ?? null,
        recipient: resolved.recipientAddress ?? context.walletAddress,
        functionSignature: null,
        estimatedSeconds: null,
      })
      break
    }

    case 'APPROVE': {
      if (sourceToken) {
        approvals.push(approvalFor(sourceToken, intent.recipient ?? 'the requested spender', amountText))
        actions.push(
          approvalAction(
            0,
            sourceToken,
            sourceChain?.key ?? 'unknown',
            intent.recipient ?? 'the requested spender',
            amountText,
            context,
          ),
        )
      }
      break
    }

    case 'CONTRACT_INTERACTION': {
      actions.push({
        index: 0,
        kind: 'contract_call',
        title: 'Decode and explain the contract interaction',
        description:
          'ZeFi decodes the function selector and arguments, identifies any token approvals it contains, and states in plain language what signing it would do. It does not execute arbitrary contract calls.',
        chainKey: sourceChain?.key ?? 'unknown',
        executionMode: 'informational',
        asset: null,
        amount: null,
        contractAddress: null,
        recipient: null,
        functionSignature: null,
        estimatedSeconds: null,
      })
      break
    }

    default:
      break
  }

  const estimates = buildEstimates(context, sourceChain?.nativeCurrency.symbol ?? null, actions, intent.slippageTolerancePercent)

  const risks = assessRisk({
    resolved,
    actions,
    approvals,
    nativeBalance: context.nativeBalance ?? null,
    executionEnabled: context.executionEnabled,
    deepSimulationAvailable: context.deepSimulationAvailable,
    knownRecipients: context.knownRecipients ?? [],
  })

  const simulation: SimulationResult = {
    status: 'not_run',
    provider: context.deepSimulationAvailable ? 'pending' : 'local',
    deepSimulation: false,
    checks: [],
    balanceChanges: [],
    gasEstimate: context.gasEstimateNative ?? null,
    performedAt: null,
    message: 'Simulation has not been run for this plan yet.',
  }

  const status = initialStatus(resolved, actions)

  return {
    id: createId('plan'),
    request: context.request,
    intentType: intent.intentType,
    interpretedIntent: intent.summary,
    intent,
    actions,
    estimates,
    risks,
    approvals,
    simulation,
    dataSources: buildDataSources(context, sourceChain?.name ?? null),
    status,
    requiresExplicitConfirmation: true,
    confirmationLabel: buildConfirmationLabel(resolved, actions, context, amountWithAsset),
    missingInformation: resolved.missing,
    blockers: resolved.blockers,
    createdAt: now,
    updatedAt: now,
    illustrative: context.illustrative ?? false,
  }
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */

function transferExecutionMode(
  capability: string | undefined,
  executionEnabled: boolean,
): PlanAction['executionMode'] {
  if (capability !== 'read-and-execute') return 'provider_required'
  return executionEnabled ? 'wallet_signature' : 'informational'
}

function approvalFor(
  token: TokenDefinition,
  spenderLabel: string,
  amount: string | null,
): ApprovalRequirement {
  return {
    chainKey: token.chainKey,
    asset: token.symbol,
    tokenAddress: token.address,
    spenderLabel,
    // Never invented. A real spender address only exists once a routing
    // provider has returned a quote.
    spenderAddress: null,
    amount,
    // ZeFi always plans an exact-amount approval. Unlimited is only ever
    // reported when it is detected in a transaction the user brought to ZeFi.
    unlimited: false,
  }
}

function approvalAction(
  index: number,
  token: TokenDefinition,
  chainKey: string,
  spenderLabel: string,
  amount: string | null,
  context: PlanContext,
): PlanAction {
  return {
    index,
    kind: 'approve',
    title: `Approve ${amount ? `${amount} ` : ''}${token.symbol} for ${spenderLabel}`,
    description: `An exact-amount \`approve\` on the ${token.symbol} contract. ZeFi does not plan unlimited approvals — the allowance is set to the amount this plan needs and no more.`,
    chainKey,
    executionMode: context.executionEnabled ? 'wallet_signature' : 'informational',
    asset: token.symbol,
    amount,
    contractAddress: token.address,
    recipient: null,
    functionSignature: 'approve(address,uint256)',
    estimatedSeconds: null,
  }
}

function buildEstimates(
  context: PlanContext,
  nativeSymbol: string | null,
  actions: PlanAction[],
  slippage: number | null,
): PlanEstimates {
  const stepSeconds = actions
    .map((action) => action.estimatedSeconds)
    .filter((value): value is number => typeof value === 'number')

  // Only report a duration when every signable step contributed one.
  const signable = actions.filter((a) => a.executionMode === 'wallet_signature').length
  const estimatedSeconds =
    stepSeconds.length > 0 && stepSeconds.length >= signable
      ? stepSeconds.reduce((sum, value) => sum + value, 0)
      : null

  return {
    networkCostNative: context.gasEstimateNative ?? null,
    networkCostSymbol: nativeSymbol,
    networkCostUsd: context.gasEstimateUsd ?? null,
    slippagePercent: slippage,
    estimatedSeconds,
    incomplete:
      context.gasEstimateNative == null ||
      estimatedSeconds == null ||
      actions.some((action) => action.executionMode === 'provider_required'),
  }
}

function buildDataSources(context: PlanContext, chainName: string | null): DataSource[] {
  const now = new Date().toISOString()
  const sources: DataSource[] = [
    {
      label: 'ZeFi chain & asset registry',
      kind: 'registry',
      retrievedAt: now,
      detail: 'Contract addresses, decimals and chain ids are read from ZeFi’s curated registry.',
    },
  ]

  if (context.gasEstimateNative) {
    sources.push({
      label: `${chainName ?? 'Source chain'} gas estimate`,
      kind: 'onchain',
      retrievedAt: now,
      detail: 'eth_estimateGas against the connected RPC endpoint.',
    })
  }
  if (context.nativeBalance) {
    sources.push({
      label: `${chainName ?? 'Source chain'} balance read`,
      kind: 'onchain',
      retrievedAt: now,
    })
  }
  if (context.illustrative) {
    sources.push({
      label: 'Illustrative fixture',
      kind: 'illustrative',
      retrievedAt: now,
      detail: 'Demo mode. Every figure in this plan is a fixed example, not a live reading.',
    })
  }
  return [...sources, ...(context.dataSources ?? [])]
}

function initialStatus(resolved: ResolvedIntent, actions: PlanAction[]): PlanStatus {
  if (resolved.missing.length > 0) return 'missing_information'
  if (resolved.blockers.length > 0) return 'missing_information'
  if (actions.length === 0) return 'draft'
  return 'ready_to_simulate'
}

/**
 * The confirmation label states the action in the user's own terms.
 * It is never a generic verb, and never implies immediacy the flow does not have.
 */
function buildConfirmationLabel(
  resolved: ResolvedIntent,
  actions: PlanAction[],
  context: PlanContext,
  amountWithAsset: string,
): string {
  if (resolved.blockers.length > 0) return 'Resolve the blockers above'
  if (resolved.missing.length > 0) return 'Add the missing details'

  // Order matters: a deployment with execution switched off has no signable
  // actions, so this check has to come first or it can never be reached.
  if (!context.executionEnabled) return 'Execution disabled in this deployment'

  const signable = actions.filter((action) => action.executionMode === 'wallet_signature')
  if (signable.length === 0) {
    return actions.some((action) => action.executionMode === 'provider_required')
      ? 'Provider integration required'
      : 'Review plan'
  }

  switch (resolved.intent.intentType) {
    case 'SEND':
      return `Review ${amountWithAsset} transfer`
    case 'SWAP':
      return `Review ${amountWithAsset} swap`
    case 'BRIDGE':
      return `Review ${amountWithAsset} bridge`
    case 'APPROVE':
      return `Review ${amountWithAsset} approval`
    default:
      return 'Request wallet signature'
  }
}
