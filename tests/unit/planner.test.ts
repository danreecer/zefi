import { describe, expect, it } from 'vitest'

import { classifyIntent, extractIntentFields } from '@/lib/intent/classify'
import { resolveIntent } from '@/lib/intent/resolve'
import { StructuredIntentSchema, type StructuredIntent } from '@/lib/intent/schema'
import { buildPlan, type PlanContext } from '@/lib/planner/build'
import { assessRisk } from '@/lib/planner/risk'

const WALLET = '0x7a3F2C8E5d1B4A6f9e0C3b7d2F5a8c1E4d6b9a0C'
const RECIPIENT = '0x4E8F2A1b9C7D3e5f6A0B1C2d3E4f5a6B7c8D9E0F'

function intent(overrides: Partial<StructuredIntent> = {}): StructuredIntent {
  return StructuredIntentSchema.parse({
    intentType: 'SEND',
    sourceNetwork: 'base',
    sourceAsset: 'USDC',
    amount: { value: '250', unit: 'token' },
    recipient: RECIPIENT,
    confidence: 0.95,
    summary: 'Transfer 250 USDC on Base.',
    ...overrides,
  })
}

const baseContext: PlanContext = {
  request: 'Send 250 USDC on Base',
  walletAddress: WALLET,
  executionEnabled: true,
  deepSimulationAvailable: false,
  swapProviderConfigured: false,
  bridgeProviderConfigured: false,
}

describe('resolveIntent', () => {
  it('resolves a complete send with no missing fields and no blockers', () => {
    const resolved = resolveIntent(intent(), { address: WALLET, chainId: 8453, chainKey: 'base' })
    expect(resolved.ready).toBe(true)
    expect(resolved.missing).toEqual([])
    expect(resolved.blockers).toEqual([])
    expect(resolved.sourceChainKey).toBe('base')
    expect(resolved.sourceTokenSymbol).toBe('USDC')
    expect(resolved.recipientAddress).toBe(RECIPIENT)
  })

  it('reports a missing recipient rather than inventing one', () => {
    const resolved = resolveIntent(intent({ recipient: null }), {
      address: WALLET,
      chainId: 8453,
      chainKey: 'base',
    })
    expect(resolved.missing).toContain('recipient')
    expect(resolved.recipientAddress).toBeNull()
    expect(resolved.ready).toBe(false)
  })

  it('requires a connected wallet for any transactional intent', () => {
    const resolved = resolveIntent(intent(), { address: null, chainId: null, chainKey: null })
    expect(resolved.missing).toContain('connectedWallet')
  })

  it('blocks a send to the connected wallet itself', () => {
    const resolved = resolveIntent(intent({ recipient: WALLET }), {
      address: WALLET,
      chainId: 8453,
      chainKey: 'base',
    })
    expect(resolved.blockers.join(' ')).toContain('connected wallet')
  })

  it('blocks a burn address', () => {
    const resolved = resolveIntent(
      intent({ recipient: '0x000000000000000000000000000000000000dEaD' }),
      { address: WALLET, chainId: 8453, chainKey: 'base' },
    )
    expect(resolved.blockers.join(' ')).toContain('burn address')
  })

  it('refuses an asset that is not in the registry for that chain', () => {
    const resolved = resolveIntent(intent({ sourceAsset: 'DAI' }), {
      address: WALLET,
      chainId: 8453,
      chainKey: 'base',
    })
    // DAI is not listed on Base — ZeFi must not guess a contract address.
    expect(resolved.blockers.join(' ')).toContain('will not guess')
  })

  it('refuses an unrecognised network', () => {
    const resolved = resolveIntent(intent({ sourceNetwork: 'avalanche' }), {
      address: WALLET,
      chainId: 8453,
      chainKey: 'base',
    })
    expect(resolved.blockers.join(' ')).toContain('does not recognise')
  })

  it('refuses a USD amount on a volatile asset without a price source', () => {
    const resolved = resolveIntent(
      intent({ sourceAsset: 'ETH', amount: { value: '2000', unit: 'usd' } }),
      { address: WALLET, chainId: 8453, chainKey: 'base' },
    )
    expect(resolved.blockers.join(' ')).toContain('live price')
  })

  it('accepts a USD amount on a stablecoin', () => {
    const resolved = resolveIntent(
      intent({ amount: { value: '2000', unit: 'usd' } }),
      { address: WALLET, chainId: 8453, chainKey: 'base' },
    )
    expect(resolved.blockers.join(' ')).not.toContain('live price')
  })

  it('rejects more precision than the asset supports', () => {
    const resolved = resolveIntent(
      intent({ amount: { value: '1.0000001', unit: 'token' } }),
      { address: WALLET, chainId: 8453, chainKey: 'base' },
    )
    expect(resolved.blockers.join(' ')).toContain('6 decimal places')
  })

  it('warns when the wallet is on a different network than the plan', () => {
    const resolved = resolveIntent(intent(), { address: WALLET, chainId: 1, chainKey: 'ethereum' })
    expect(resolved.blockers.join(' ')).toContain('switch networks')
  })

  it('states that Solana cannot originate a transaction', () => {
    const resolved = resolveIntent(
      intent({ sourceNetwork: 'solana', sourceAsset: 'USDC', recipient: null }),
      { address: WALLET, chainId: 8453, chainKey: 'base' },
    )
    expect(resolved.blockers.join(' ')).toContain('no wallet connection')
  })

  it('requires a destination network for a bridge', () => {
    const resolved = resolveIntent(
      intent({ intentType: 'BRIDGE', destinationNetwork: null, recipient: null }),
      { address: WALLET, chainId: 8453, chainKey: 'base' },
    )
    expect(resolved.missing).toContain('destinationNetwork')
  })

  it('rejects a bridge whose endpoints are the same chain', () => {
    const resolved = resolveIntent(
      intent({ intentType: 'BRIDGE', destinationNetwork: 'base', recipient: null }),
      { address: WALLET, chainId: 8453, chainKey: 'base' },
    )
    expect(resolved.blockers.join(' ')).toContain('same')
  })
})

describe('buildPlan', () => {
  it('builds a single signable action for an ERC-20 transfer', () => {
    const resolved = resolveIntent(intent(), { address: WALLET, chainId: 8453, chainKey: 'base' })
    const plan = buildPlan(resolved, baseContext)

    expect(plan.actions).toHaveLength(1)
    expect(plan.actions[0]?.executionMode).toBe('wallet_signature')
    expect(plan.actions[0]?.functionSignature).toBe('transfer(address,uint256)')
    expect(plan.actions[0]?.contractAddress).toBe('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913')
    expect(plan.status).toBe('ready_to_simulate')
    expect(plan.confirmationLabel).toBe('Review 250 USDC transfer')
  })

  it('never emits a fee, rate or duration it was not given', () => {
    const resolved = resolveIntent(intent(), { address: WALLET, chainId: 8453, chainKey: 'base' })
    const plan = buildPlan(resolved, baseContext)

    expect(plan.estimates.networkCostNative).toBeNull()
    expect(plan.estimates.networkCostUsd).toBeNull()
    expect(plan.estimates.incomplete).toBe(true)
  })

  it('reports a real gas estimate when one is supplied', () => {
    const resolved = resolveIntent(intent(), { address: WALLET, chainId: 8453, chainKey: 'base' })
    const plan = buildPlan(resolved, { ...baseContext, gasEstimateNative: '0.0000164', gasEstimateUsd: 0.06 })

    expect(plan.estimates.networkCostNative).toBe('0.0000164')
    expect(plan.dataSources.some((source) => source.kind === 'onchain')).toBe(true)
  })

  it('marks a bridge step provider-required when no bridge provider is configured', () => {
    const resolved = resolveIntent(
      intent({
        intentType: 'BRIDGE',
        destinationNetwork: 'solana',
        destinationAsset: 'USDC',
        recipient: null,
      }),
      { address: WALLET, chainId: 8453, chainKey: 'base' },
    )
    const plan = buildPlan(resolved, baseContext)

    const bridge = plan.actions.find((action) => action.kind === 'bridge')
    expect(bridge?.executionMode).toBe('provider_required')
    expect(bridge?.providerRequirement).toContain('BRIDGE_PROVIDER')
    expect(plan.actions.some((action) => action.kind === 'receive')).toBe(true)
  })

  it('plans only exact-amount approvals', () => {
    const resolved = resolveIntent(
      intent({ intentType: 'SWAP', destinationAsset: 'ETH', recipient: null }),
      { address: WALLET, chainId: 8453, chainKey: 'base' },
    )
    const plan = buildPlan(resolved, baseContext)

    expect(plan.approvals.length).toBeGreaterThan(0)
    for (const approval of plan.approvals) {
      expect(approval.unlimited).toBe(false)
      expect(approval.amount).toBe('250')
      // A spender address only exists once a routing provider quotes.
      expect(approval.spenderAddress).toBeNull()
    }
  })

  it('labels the confirm control for a deployment with execution switched off', () => {
    const resolved = resolveIntent(intent(), { address: WALLET, chainId: 8453, chainKey: 'base' })
    const plan = buildPlan(resolved, { ...baseContext, executionEnabled: false })

    expect(plan.confirmationLabel).toBe('Execution disabled in this deployment')
    expect(plan.actions[0]?.executionMode).toBe('informational')
  })

  it('never labels the confirm control with immediacy', () => {
    for (const type of ['SEND', 'SWAP', 'BRIDGE', 'APPROVE'] as const) {
      const resolved = resolveIntent(
        intent({ intentType: type, destinationNetwork: type === 'BRIDGE' ? 'arbitrum' : null, destinationAsset: 'ETH' }),
        { address: WALLET, chainId: 8453, chainKey: 'base' },
      )
      const plan = buildPlan(resolved, baseContext)
      expect(plan.confirmationLabel.toLowerCase(), type).not.toContain('instant')
      expect(plan.requiresExplicitConfirmation, type).toBe(true)
    }
  })

  it('carries the user’s original request verbatim', () => {
    const request = 'Send 250 USDC to a friend, please'
    const resolved = resolveIntent(intent(), { address: WALLET, chainId: 8453, chainKey: 'base' })
    expect(buildPlan(resolved, { ...baseContext, request }).request).toBe(request)
  })

  it('starts a plan with missing fields in missing_information', () => {
    const resolved = resolveIntent(intent({ recipient: null }), {
      address: WALLET,
      chainId: 8453,
      chainKey: 'base',
    })
    expect(buildPlan(resolved, baseContext).status).toBe('missing_information')
  })
})

describe('risk engine', () => {
  const resolved = resolveIntent(intent(), { address: WALLET, chainId: 8453, chainKey: 'base' })
  const plan = buildPlan(resolved, baseContext)

  it('flags a first-time recipient', () => {
    const risks = assessRisk({
      resolved,
      actions: plan.actions,
      approvals: plan.approvals,
      nativeBalance: null,
      executionEnabled: true,
      deepSimulationAvailable: false,
      knownRecipients: [],
    })
    expect(risks.map((risk) => risk.code)).toContain('NEW_RECIPIENT')
  })

  it('does not flag an address the user has sent to before', () => {
    const risks = assessRisk({
      resolved,
      actions: plan.actions,
      approvals: plan.approvals,
      nativeBalance: null,
      executionEnabled: true,
      deepSimulationAvailable: false,
      knownRecipients: [RECIPIENT.toLowerCase()],
    })
    expect(risks.map((risk) => risk.code)).not.toContain('NEW_RECIPIENT')
  })

  it('always states when deep simulation is unavailable', () => {
    const risks = assessRisk({
      resolved,
      actions: plan.actions,
      approvals: plan.approvals,
      nativeBalance: null,
      executionEnabled: true,
      deepSimulationAvailable: false,
      knownRecipients: [],
    })
    expect(risks.map((risk) => risk.code)).toContain('DEEP_SIMULATION_UNAVAILABLE')
  })

  it('warns when a transfer would leave too little gas', () => {
    const ethIntent = resolveIntent(
      intent({ sourceAsset: 'ETH', amount: { value: '0.9995', unit: 'token' } }),
      { address: WALLET, chainId: 8453, chainKey: 'base' },
    )
    const risks = assessRisk({
      resolved: ethIntent,
      actions: buildPlan(ethIntent, baseContext).actions,
      approvals: [],
      nativeBalance: '1.0',
      executionEnabled: true,
      deepSimulationAvailable: false,
      knownRecipients: [],
    })
    expect(risks.map((risk) => risk.code)).toContain('GAS_RESERVE_LOW')
  })

  it('escalates high slippage to critical past ten percent', () => {
    const slippy = resolveIntent(
      intent({ intentType: 'SWAP', destinationAsset: 'ETH', slippageTolerancePercent: 12 }),
      { address: WALLET, chainId: 8453, chainKey: 'base' },
    )
    const risks = assessRisk({
      resolved: slippy,
      actions: [],
      approvals: [],
      nativeBalance: null,
      executionEnabled: true,
      deepSimulationAvailable: false,
      knownRecipients: [],
    })
    expect(risks.find((risk) => risk.code === 'HIGH_SLIPPAGE')?.severity).toBe('critical')
  })

  it('sorts critical findings first', () => {
    const blocked = resolveIntent(intent({ recipient: '0x000000000000000000000000000000000000dEaD' }), {
      address: WALLET,
      chainId: 8453,
      chainKey: 'base',
    })
    const risks = assessRisk({
      resolved: blocked,
      actions: [],
      approvals: [],
      nativeBalance: null,
      executionEnabled: true,
      deepSimulationAvailable: false,
      knownRecipients: [],
    })
    expect(risks[0]?.severity).toBe('critical')
  })
})

describe('deterministic end-to-end (no model)', () => {
  it('turns the hero prompt into a bridge plan with a cross-VM warning', () => {
    const fields = extractIntentFields('Move $2,000 of USDC from Base to Solana using the safest route.')
    const parsed = StructuredIntentSchema.parse({
      intentType: fields.classification.intentType,
      sourceNetwork: fields.sourceNetwork,
      destinationNetwork: fields.destinationNetwork,
      sourceAsset: fields.sourceAsset,
      destinationAsset: fields.destinationAsset,
      amount: fields.amount,
      recipient: fields.recipient,
      priority: fields.priority,
      confidence: fields.classification.confidence,
      summary: 'Bridge 2,000 USDC from Base to Solana.',
    })

    const resolved = resolveIntent(parsed, { address: WALLET, chainId: 8453, chainKey: 'base' })
    const plan = buildPlan(resolved, baseContext)

    expect(classifyIntent('Move $2,000 of USDC from Base to Solana using the safest route.').intentType).toBe('BRIDGE')
    expect(plan.intentType).toBe('BRIDGE')
    expect(plan.risks.map((risk) => risk.code)).toContain('CROSS_VM_ROUTE')
    expect(plan.risks.map((risk) => risk.code)).toContain('BRIDGE_TRUST_ASSUMPTION')
    expect(plan.actions.some((action) => action.executionMode === 'provider_required')).toBe(true)
  })
})
