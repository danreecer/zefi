import type { StructuredIntent } from '@/lib/intent/schema'
import type { TransactionPlan } from '@/lib/planner/types'

/**
 * Deterministic demo fixtures.
 *
 * Three rules govern this file:
 *
 *  1. Every object is a literal with a fixed timestamp. Nothing is computed at
 *     render time, so server and client always agree and the marketing pages
 *     stay statically renderable.
 *  2. Every plan carries `illustrative: true` and an `illustrative` data source.
 *     The UI reads that flag and labels the figures; it is not a convention
 *     someone has to remember.
 *  3. Nothing here is ever substituted for a failed live call. Fixtures appear
 *     only on marketing surfaces and in explicitly-labelled demo mode.
 */

export const FIXTURE_TIMESTAMP = '2026-03-18T09:41:00.000Z'

export const HERO_PROMPT = 'Move $2,000 of USDC from Base to Solana using the safest route.'

const heroIntent: StructuredIntent = {
  intentType: 'BRIDGE',
  sourceNetwork: 'base',
  destinationNetwork: 'solana',
  sourceAsset: 'USDC',
  destinationAsset: 'USDC',
  amount: { value: '2000', unit: 'usd' },
  recipient: null,
  slippageTolerancePercent: null,
  priority: 'safest',
  requiredApprovals: [],
  missingInformation: ['recipient'],
  confidence: 0.94,
  assumptions: [
    'USDC is treated as a 1:1 dollar equivalent, so $2,000 resolves to 2,000 USDC.',
    'The destination is your own wallet unless a Solana address is supplied.',
  ],
  clarifyingQuestion: 'Which Solana address should receive the USDC?',
  summary: 'Bridge 2,000 USDC from Base to Solana, prioritising the lowest-trust route.',
}

/**
 * The plan shown in the hero. Structurally identical to a plan the live planner
 * produces — same fields, same status vocabulary, same honesty about what needs
 * a provider — with figures marked as illustrative.
 */
export const HERO_PLAN: TransactionPlan = {
  id: 'plan_demo_hero',
  request: HERO_PROMPT,
  intentType: 'BRIDGE',
  interpretedIntent: heroIntent.summary,
  intent: heroIntent,
  actions: [
    {
      index: 0,
      kind: 'approve',
      title: 'Approve 2,000 USDC for the bridge contract',
      description:
        'An exact-amount approve on the Base USDC contract. ZeFi does not plan unlimited approvals.',
      chainKey: 'base',
      executionMode: 'informational',
      asset: 'USDC',
      amount: '2,000',
      contractAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      recipient: null,
      functionSignature: 'approve(address,uint256)',
      estimatedSeconds: 4,
    },
    {
      index: 1,
      kind: 'bridge',
      title: 'Bridge 2,000 USDC from Base to Solana',
      description:
        'A burn-and-mint route rather than a liquidity pool, so the USDC that arrives is canonical rather than a wrapped claim.',
      chainKey: 'base',
      executionMode: 'provider_required',
      providerRequirement: 'Bridge routing provider (BRIDGE_PROVIDER)',
      asset: 'USDC',
      amount: '2,000',
      contractAddress: null,
      recipient: null,
      functionSignature: null,
      estimatedSeconds: 86,
    },
    {
      index: 2,
      kind: 'receive',
      title: 'Receive 2,000 USDC on Solana',
      description: 'Settlement on the destination chain. No signature is required from you.',
      chainKey: 'solana',
      executionMode: 'informational',
      asset: 'USDC',
      amount: null,
      contractAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      recipient: null,
      functionSignature: null,
      estimatedSeconds: null,
    },
  ],
  estimates: {
    networkCostNative: '0.00021',
    networkCostSymbol: 'ETH',
    networkCostUsd: 0.71,
    slippagePercent: 0,
    estimatedSeconds: 90,
    incomplete: true,
  },
  risks: [
    {
      code: 'CROSS_VM_ROUTE',
      severity: 'caution',
      title: 'Route crosses virtual machines',
      detail:
        'Base is an EVM chain and Solana is not. The destination address format differs, and an address valid on one side is invalid on the other. ZeFi requires the Solana address to be confirmed separately before signing.',
    },
    {
      code: 'BRIDGE_TRUST_ASSUMPTION',
      severity: 'caution',
      title: 'Bridging adds a trust assumption',
      detail:
        'For the period funds are in transit you rely on the bridge’s attestation set rather than on Base or Solana alone.',
    },
    {
      code: 'PROVIDER_INTEGRATION_REQUIRED',
      severity: 'info',
      title: '1 step needs a routing provider',
      detail:
        'ZeFi has planned the bridge and can describe every step, but cannot build calldata without a bridge provider configured. Nothing will be submitted for signature.',
    },
  ],
  approvals: [
    {
      chainKey: 'base',
      asset: 'USDC',
      tokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      spenderLabel: 'the bridge contract',
      spenderAddress: null,
      amount: '2,000',
      unlimited: false,
    },
  ],
  simulation: {
    status: 'local_only',
    provider: 'local',
    deepSimulation: false,
    checks: [
      { id: 'chain', label: 'Chain resolves to a supported network', outcome: 'pass', detail: 'Base · chain id 8453.' },
      { id: 'asset', label: 'Asset resolves in the registry', outcome: 'pass', detail: 'USDC · 6 decimals · 0x8335…2913' },
      { id: 'amount', label: 'Amount is representable', outcome: 'warn', detail: 'Amount is a US-dollar value; it resolves to an exact token amount at signing time.' },
      { id: 'recipient', label: 'Recipient address', outcome: 'skipped', detail: 'No Solana destination address supplied yet.' },
      { id: 'approvals', label: 'No unlimited approvals', outcome: 'pass', detail: '1 exact-amount approval.' },
      { id: 'calldata', label: 'Every step can be encoded', outcome: 'warn', detail: '1 step needs a routing provider before calldata can be produced.' },
    ],
    balanceChanges: [
      { chainKey: 'base', asset: 'USDC', direction: 'decrease', amount: '2000', projected: true },
      { chainKey: 'solana', asset: 'USDC', direction: 'increase', amount: '2000', projected: true },
    ],
    gasEstimate: '0.00021',
    performedAt: FIXTURE_TIMESTAMP,
    message: 'Local deterministic validation only. ZeFi has not executed this transaction against chain state.',
  },
  dataSources: [
    {
      label: 'ZeFi chain & asset registry',
      kind: 'registry',
      retrievedAt: FIXTURE_TIMESTAMP,
      detail: 'Contract addresses, decimals and chain ids.',
    },
    {
      label: 'Illustrative fixture',
      kind: 'illustrative',
      retrievedAt: FIXTURE_TIMESTAMP,
      detail: 'Example figures for demonstration. Not a live reading.',
    },
  ],
  status: 'missing_information',
  requiresExplicitConfirmation: true,
  confirmationLabel: 'Add the missing details',
  missingInformation: ['recipient'],
  blockers: [],
  createdAt: FIXTURE_TIMESTAMP,
  updatedAt: FIXTURE_TIMESTAMP,
  illustrative: true,
}

/** A second fixture: a plan ZeFi can actually sign end-to-end. */
export const TRANSFER_PLAN: TransactionPlan = {
  id: 'plan_demo_transfer',
  request: 'Send 250 USDC to 0x4E8F2A1b9C7D3e5f6A0B1C2d3E4f5a6B7c8D9E0F on Base',
  intentType: 'SEND',
  interpretedIntent: 'Transfer 250 USDC on Base to a single external address.',
  intent: {
    intentType: 'SEND',
    sourceNetwork: 'base',
    destinationNetwork: null,
    sourceAsset: 'USDC',
    destinationAsset: null,
    amount: { value: '250', unit: 'token' },
    recipient: '0x4E8F2A1b9C7D3e5f6A0B1C2d3E4f5a6B7c8D9E0F',
    slippageTolerancePercent: null,
    priority: null,
    requiredApprovals: [],
    missingInformation: [],
    confidence: 0.97,
    assumptions: [],
    clarifyingQuestion: null,
    summary: 'Transfer 250 USDC on Base to a single external address.',
  },
  actions: [
    {
      index: 0,
      kind: 'transfer',
      title: 'Transfer 250 USDC on Base',
      description:
        'An ERC-20 transfer call on the USDC contract. Your wallet signs it directly; ZeFi never holds the funds.',
      chainKey: 'base',
      executionMode: 'wallet_signature',
      asset: 'USDC',
      amount: '250',
      contractAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      recipient: '0x4E8F2A1b9C7D3e5f6A0B1C2d3E4f5a6B7c8D9E0F',
      functionSignature: 'transfer(address,uint256)',
      estimatedSeconds: 4,
    },
  ],
  estimates: {
    networkCostNative: '0.0000164',
    networkCostSymbol: 'ETH',
    networkCostUsd: 0.06,
    slippagePercent: null,
    estimatedSeconds: 4,
    incomplete: false,
  },
  risks: [
    {
      code: 'NEW_RECIPIENT',
      severity: 'caution',
      title: 'First transfer to this address',
      detail:
        'ZeFi has no record of you sending to this address before. Transfers are irreversible — check the full address, not just the first and last four characters.',
    },
    {
      code: 'DEEP_SIMULATION_UNAVAILABLE',
      severity: 'info',
      title: 'Deep simulation is not configured',
      detail:
        'Local deterministic checks passed. ZeFi has not executed this transaction against forked chain state.',
    },
  ],
  approvals: [],
  simulation: {
    status: 'local_only',
    provider: 'local',
    deepSimulation: false,
    checks: [
      { id: 'chain', label: 'Chain resolves to a supported network', outcome: 'pass', detail: 'Base · chain id 8453.' },
      { id: 'wallet', label: 'Wallet is on the plan’s network', outcome: 'pass', detail: 'Connected wallet matches the plan’s network.' },
      { id: 'recipient', label: 'Recipient address', outcome: 'pass', detail: 'Checksum valid · 0x4E8f…9e0F' },
      { id: 'asset', label: 'Asset resolves in the registry', outcome: 'pass', detail: 'USDC · 6 decimals · 0x8335…2913' },
      { id: 'amount', label: 'Amount is representable', outcome: 'pass', detail: '250 USDC encodes exactly at 6 decimals.' },
      { id: 'balance', label: 'Balance covers the amount', outcome: 'pass', detail: 'Balance 1,284.30 USDC.' },
      { id: 'approvals', label: 'No unlimited approvals', outcome: 'pass', detail: 'This plan requests no token approvals.' },
      { id: 'calldata', label: 'Every step can be encoded', outcome: 'pass', detail: 'All steps map to a known function on a registry contract.' },
    ],
    balanceChanges: [{ chainKey: 'base', asset: 'USDC', direction: 'decrease', amount: '250', projected: true }],
    gasEstimate: '0.0000164',
    performedAt: FIXTURE_TIMESTAMP,
    message: 'Local deterministic validation only. ZeFi has not executed this transaction against chain state.',
  },
  dataSources: [
    { label: 'ZeFi chain & asset registry', kind: 'registry', retrievedAt: FIXTURE_TIMESTAMP },
    { label: 'Illustrative fixture', kind: 'illustrative', retrievedAt: FIXTURE_TIMESTAMP, detail: 'Example figures for demonstration.' },
  ],
  status: 'ready_for_signature',
  requiresExplicitConfirmation: true,
  confirmationLabel: 'Review 250 USDC transfer',
  missingInformation: [],
  blockers: [],
  createdAt: FIXTURE_TIMESTAMP,
  updatedAt: FIXTURE_TIMESTAMP,
  illustrative: true,
}

export interface DemoPosition {
  symbol: string
  amount: string
  valueUsd: number
  kind: 'native' | 'stablecoin' | 'asset'
}

export interface DemoChainHolding {
  chainKey: string
  valueUsd: number
  positions: DemoPosition[]
}

export interface DemoWallet {
  address: string
  readAt: string
  illustrative: true
  totalUsd: number
  chains: DemoChainHolding[]
}

/** Wallet snapshot used on the marketing "wallet intelligence" section. */
export const DEMO_WALLET: DemoWallet = {
  address: '0x7a3F2C8E5d1B4A6f9e0C3b7d2F5a8c1E4d6b9a0C',
  readAt: FIXTURE_TIMESTAMP,
  illustrative: true as const,
  totalUsd: 48213.55,
  chains: [
    {
      chainKey: 'base',
      valueUsd: 24180.12,
      positions: [
        { symbol: 'USDC', amount: '18240.55', valueUsd: 18240.55, kind: 'stablecoin' as const },
        { symbol: 'ETH', amount: '1.8412', valueUsd: 5939.57, kind: 'native' as const },
      ],
    },
    {
      chainKey: 'ethereum',
      valueUsd: 15922.4,
      positions: [
        { symbol: 'ETH', amount: '3.204', valueUsd: 10334.9, kind: 'native' as const },
        { symbol: 'WBTC', amount: '0.0621', valueUsd: 5587.5, kind: 'asset' as const },
      ],
    },
    {
      chainKey: 'arbitrum',
      valueUsd: 8111.03,
      positions: [
        { symbol: 'USDC', amount: '6420.00', valueUsd: 6420.0, kind: 'stablecoin' as const },
        { symbol: 'ETH', amount: '0.5241', valueUsd: 1691.03, kind: 'native' as const },
      ],
    },
  ],
}

export interface DemoMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  planId?: string
}

export interface DemoConversation {
  id: string
  title: string
  updatedAt: string
  messages: DemoMessage[]
}

export const DEMO_CONVERSATIONS: DemoConversation[] = [
  {
    id: 'conv_demo_bridge',
    title: 'Base to Solana USDC Route',
    updatedAt: FIXTURE_TIMESTAMP,
    messages: [
      { id: 'm1', role: 'user', content: HERO_PROMPT },
      {
        id: 'm2',
        role: 'assistant',
        planId: HERO_PLAN.id,
        content:
          'These figures are a fixed example, not a live reading.\n\nZeFi read this as a bridge of 2,000 USDC from Base to Solana, weighted toward the lowest-trust route rather than the fastest. The plan is three steps: an exact-amount approval on Base, the bridge itself, and settlement on Solana that needs no signature from you.\n\nOne thing is still missing — a Solana destination address. Base addresses are not valid on Solana, so ZeFi will not infer one. The bridge step also needs a routing provider before calldata can be built, so nothing here can be submitted for signature yet.',
      },
    ],
  },
  {
    id: 'conv_demo_wallet',
    title: 'Stablecoin Exposure Review',
    updatedAt: '2026-03-17T16:12:00.000Z',
    messages: [
      { id: 'm1', role: 'user', content: 'How much stablecoin exposure do I have?' },
      {
        id: 'm2',
        role: 'assistant',
        content:
          'Across the three networks ZeFi read at 09:41 UTC, **24,660.55 USDC** is about **51%** of the 48,213.55 total — all of it USDC, none in USDT or DAI.\n\nThat concentration is a single-issuer position as much as a currency one: every one of those units depends on the same redemption process. Splitting across issuers changes the failure mode, though it does not reduce it.\n\nThis covers the assets in ZeFi’s verified registry. Tokens outside it are not included in the total.',
      },
    ],
  },
  {
    id: 'conv_demo_transfer',
    title: 'Base USDC Transfer',
    updatedAt: '2026-03-16T11:04:00.000Z',
    messages: [
      { id: 'm1', role: 'user', content: 'Send 250 USDC to 0x4E8F2A1b9C7D3e5f6A0B1C2d3E4f5a6B7c8D9E0F on Base' },
      {
        id: 'm2',
        role: 'assistant',
        planId: TRANSFER_PLAN.id,
        content:
          'One step: an ERC-20 transfer of 250 USDC on Base, signed by your wallet. Network cost is roughly 0.0000164 ETH. All eight local checks passed, including that your balance covers it.\n\nZeFi has no record of you sending to this address before, and transfers do not reverse. Check the full address against a source you trust before approving — the middle characters are where a swapped address hides.',
      },
    ],
  },
]

export const DEMO_PLANS: TransactionPlan[] = [HERO_PLAN, TRANSFER_PLAN]

export function getDemoPlan(id: string): TransactionPlan | null {
  return DEMO_PLANS.find((plan) => plan.id === id) ?? null
}

/** Quick prompts offered on empty states across the app. */
export const QUICK_PROMPTS = [
  'Explain what is in my wallet.',
  'How much stablecoin exposure do I have?',
  'Create a plan to move 500 USDC from Ethereum to Base.',
  'What approvals would this transaction require?',
  'Which of my positions has the highest smart-contract exposure?',
  'Explain this contract interaction before I sign.',
] as const
