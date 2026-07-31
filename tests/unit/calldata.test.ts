import { describe, expect, it } from 'vitest'
import { decodeFunctionData, parseUnits } from 'viem'

import { ERC20_ABI, findToken } from '@/lib/chains/registry'
import { resolveIntent } from '@/lib/intent/resolve'
import { StructuredIntentSchema, type StructuredIntent } from '@/lib/intent/schema'
import { resolveTransfer } from '@/lib/planner/calldata'
import { buildPlan, type PlanContext } from '@/lib/planner/build'

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

const context: PlanContext = {
  request: 'Send 250 USDC on Base',
  walletAddress: WALLET,
  executionEnabled: true,
  deepSimulationAvailable: false,
  swapProviderConfigured: false,
  bridgeProviderConfigured: false,
}

function planFor(overrides: Partial<StructuredIntent> = {}) {
  const resolved = resolveIntent(intent(overrides), { address: WALLET, chainId: 8453, chainKey: 'base' })
  return buildPlan(resolved, context)
}

describe('resolveTransfer', () => {
  it('encodes an ERC-20 transfer to the token contract, not the recipient', () => {
    const result = resolveTransfer(planFor())
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const token = findToken('base', 'USDC')
    expect(result.transfer.kind).toBe('erc20_transfer')
    expect(result.transfer.to.toLowerCase()).toBe(token?.address?.toLowerCase())
    expect(result.transfer.recipient).toBe(RECIPIENT)
    // A token transfer must carry no native value.
    expect(result.transfer.value).toBe(0n)
  })

  it('encodes calldata that decodes back to the exact recipient and amount', () => {
    const result = resolveTransfer(planFor())
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const decoded = decodeFunctionData({ abi: ERC20_ABI, data: result.transfer.data })
    expect(decoded.functionName).toBe('transfer')
    expect(decoded.args?.[0]).toBe(RECIPIENT)
    // USDC is 6 decimals: 250 must not be encoded as 250 * 10^18.
    expect(decoded.args?.[1]).toBe(parseUnits('250', 6))
  })

  it('sends native value directly to the recipient with empty calldata', () => {
    const result = resolveTransfer(planFor({ sourceAsset: 'ETH', amount: { value: '0.5', unit: 'token' } }))
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.transfer.kind).toBe('native_transfer')
    expect(result.transfer.to).toBe(RECIPIENT)
    expect(result.transfer.data).toBe('0x')
    expect(result.transfer.value).toBe(parseUnits('0.5', 18))
  })

  it('strips digit grouping before parsing an amount', () => {
    // The intent schema rejects "1,250" outright, so a comma can only reach the
    // resolver on a plan built by other means. The defence still has to hold.
    const plan = planFor()
    const grouped = { ...plan, actions: plan.actions.map((a) => (a.amount ? { ...a, amount: '1,250' } : a)) }
    const result = resolveTransfer(grouped)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.transfer.amount).toBe(parseUnits('1250', 6))
  })

  it('refuses to round an amount down to the asset’s precision', () => {
    // viem's parseUnits would silently turn this into 1.123457 USDC. Sending a
    // different number than the user asked for is never an acceptable recovery.
    const plan = planFor()
    const tooPrecise = { ...plan, actions: plan.actions.map((a) => (a.amount ? { ...a, amount: '1.1234567' } : a)) }
    const result = resolveTransfer(tooPrecise)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toMatch(/6 decimal places; the amount specifies 7/i)
  })

  it('refuses a plan with no signable step rather than guessing one', () => {
    const plan = planFor()
    const stripped = { ...plan, actions: plan.actions.map((a) => ({ ...a, executionMode: 'provider_required' as const })) }
    const result = resolveTransfer(stripped)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toMatch(/no step that a wallet can sign/i)
  })

  it('rejects a malformed recipient instead of encoding it', () => {
    const plan = planFor()
    const broken = {
      ...plan,
      actions: plan.actions.map((a) => (a.recipient ? { ...a, recipient: '0xnope' } : a)),
    }
    const result = resolveTransfer(broken)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toMatch(/not a valid EVM address/i)
  })

  it('rejects a zero amount', () => {
    const plan = planFor()
    const zeroed = { ...plan, actions: plan.actions.map((a) => (a.amount ? { ...a, amount: '0' } : a)) }
    const result = resolveTransfer(zeroed)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toMatch(/greater than zero/i)
  })

})
