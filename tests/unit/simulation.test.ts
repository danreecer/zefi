import { describe, expect, it } from 'vitest'

import { TRANSFER_PLAN } from '@/lib/demo/fixtures'
import type { TransactionPlan } from '@/lib/planner/types'
import { LocalSimulationProvider, compareDecimalStrings } from '@/lib/simulation/local'
import { describeSimulation, isFullySimulated, summariseChecks } from '@/lib/simulation/types'

const provider = new LocalSimulationProvider()
const WALLET = '0x7a3F2C8E5d1B4A6f9e0C3b7d2F5a8c1E4d6b9a0C'

/** The fixture with its own recorded simulation stripped back to a fresh plan. */
function plan(overrides: Partial<TransactionPlan> = {}): TransactionPlan {
  return { ...TRANSFER_PLAN, ...overrides }
}

describe('LocalSimulationProvider', () => {
  it('never claims to be a deep simulation', async () => {
    expect(provider.deep).toBe(false)
    const result = await provider.simulate({ plan: plan(), wallet: { address: WALLET, chainId: 8453 } })
    expect(result.deepSimulation).toBe(false)
    expect(result.provider).toBe('local')
    expect(result.message).toContain('has not executed this transaction against chain state')
  })

  it('reports local_only rather than passed when everything checks out', async () => {
    const result = await provider.simulate({
      plan: plan(),
      wallet: { address: WALLET, chainId: 8453 },
      balances: [
        {
          chainKey: 'base',
          symbol: 'USDC',
          amount: '1284.30',
          decimals: 6,
          address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          readAt: new Date().toISOString(),
        },
      ],
    })
    expect(result.status).toBe('local_only')
    expect(result.checks.every((check) => check.outcome !== 'fail')).toBe(true)
  })

  it('marks a balance check skipped — not passed — when no reading exists', async () => {
    const result = await provider.simulate({ plan: plan(), wallet: { address: WALLET, chainId: 8453 } })
    const balance = result.checks.find((check) => check.id === 'balance')
    expect(balance?.outcome).toBe('skipped')
    expect(balance?.detail).toContain('has not verified')
  })

  it('fails when the balance does not cover the amount', async () => {
    const result = await provider.simulate({
      plan: plan(),
      wallet: { address: WALLET, chainId: 8453 },
      balances: [
        {
          chainKey: 'base',
          symbol: 'USDC',
          amount: '10',
          decimals: 6,
          address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          readAt: new Date().toISOString(),
        },
      ],
    })
    expect(result.status).toBe('failed')
    expect(result.checks.find((check) => check.id === 'balance')?.outcome).toBe('fail')
  })

  it('warns when the wallet is on a different chain than the plan', async () => {
    const result = await provider.simulate({ plan: plan(), wallet: { address: WALLET, chainId: 1 } })
    expect(result.checks.find((check) => check.id === 'wallet')?.outcome).toBe('warn')
    expect(result.status).toBe('warning')
  })

  it('skips the wallet check when nothing is connected', async () => {
    const result = await provider.simulate({ plan: plan(), wallet: { address: null, chainId: null } })
    expect(result.checks.find((check) => check.id === 'wallet')?.outcome).toBe('skipped')
  })

  it('fails a malformed recipient', async () => {
    const [first] = TRANSFER_PLAN.actions
    if (!first) throw new Error('fixture has no actions')
    const broken = plan({ actions: [{ ...first, recipient: '0xnope' }] })
    const result = await provider.simulate({ plan: broken, wallet: { address: WALLET, chainId: 8453 } })
    expect(result.checks.find((check) => check.id === 'recipient')?.outcome).toBe('fail')
    expect(result.status).toBe('failed')
  })

  it('refuses an unlimited approval outright', async () => {
    const risky = plan({
      approvals: [
        {
          chainKey: 'base',
          asset: 'USDC',
          tokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          spenderLabel: 'a router',
          spenderAddress: null,
          amount: null,
          unlimited: true,
        },
      ],
    })
    const result = await provider.simulate({ plan: risky, wallet: { address: WALLET, chainId: 8453 } })
    expect(result.checks.find((check) => check.id === 'approvals')?.outcome).toBe('fail')
    expect(result.status).toBe('failed')
  })

  it('warns when a step still needs a routing provider', async () => {
    const [first] = TRANSFER_PLAN.actions
    if (!first) throw new Error('fixture has no actions')
    const blocked = plan({ actions: [{ ...first, executionMode: 'provider_required' }] })
    const result = await provider.simulate({ plan: blocked, wallet: { address: WALLET, chainId: 8453 } })
    expect(result.checks.find((check) => check.id === 'calldata')?.outcome).toBe('warn')
  })

  it('projects the balance change it expects', async () => {
    const result = await provider.simulate({
      plan: plan(),
      wallet: { address: WALLET, chainId: 8453 },
      balances: [
        {
          chainKey: 'base',
          symbol: 'USDC',
          amount: '1000',
          decimals: 6,
          address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          readAt: new Date().toISOString(),
        },
      ],
    })
    const change = result.balanceChanges[0]
    expect(change?.direction).toBe('decrease')
    expect(change?.amount).toBe('250')
    // Projected, not observed — the distinction is the whole point.
    expect(change?.projected).toBe(true)
  })
})

describe('summariseChecks', () => {
  const pass = { id: 'a', label: 'a', outcome: 'pass' as const, detail: '' }
  const warn = { id: 'b', label: 'b', outcome: 'warn' as const, detail: '' }
  const fail = { id: 'c', label: 'c', outcome: 'fail' as const, detail: '' }

  it('never reports passed for a shallow run', () => {
    expect(summariseChecks([pass, pass], false)).toBe('local_only')
    expect(summariseChecks([pass, pass], true)).toBe('passed')
  })

  it('lets a failure outrank a warning', () => {
    expect(summariseChecks([pass, warn, fail], true)).toBe('failed')
    expect(summariseChecks([pass, warn], true)).toBe('warning')
  })
})

describe('describeSimulation', () => {
  it('says plainly that a local run is not a simulation', () => {
    const text = describeSimulation({
      status: 'local_only',
      provider: 'local',
      deepSimulation: false,
      checks: [],
      balanceChanges: [],
      gasEstimate: null,
      performedAt: null,
      message: '',
    })
    expect(text).toContain('not been executed against chain state')
  })

  it('says an unreachable provider verified nothing', () => {
    const text = describeSimulation({
      status: 'unavailable',
      provider: 'none',
      deepSimulation: false,
      checks: [],
      balanceChanges: [],
      gasEstimate: null,
      performedAt: null,
      message: '',
    })
    expect(text).toContain('has not verified')
  })
})

describe('isFullySimulated', () => {
  it('is true only for a genuine against-state execution', () => {
    const shape = {
      provider: 'x',
      checks: [],
      balanceChanges: [],
      gasEstimate: null,
      performedAt: null,
      message: '',
    }
    expect(isFullySimulated({ ...shape, status: 'passed', deepSimulation: true })).toBe(true)
    expect(isFullySimulated({ ...shape, status: 'warning', deepSimulation: true })).toBe(true)
    expect(isFullySimulated({ ...shape, status: 'local_only', deepSimulation: false })).toBe(false)
    expect(isFullySimulated({ ...shape, status: 'passed', deepSimulation: false })).toBe(false)
    expect(isFullySimulated({ ...shape, status: 'failed', deepSimulation: true })).toBe(false)
  })
})

describe('compareDecimalStrings', () => {
  it.each([
    ['1', '1', 0],
    ['1.5', '1.50', 0],
    ['2', '1.999999', 1],
    ['0.000001', '0.000002', -1],
    ['1000000000000', '999999999999', 1],
  ])('compares %s to %s', (a, b, expected) => {
    expect(compareDecimalStrings(a, b)).toBe(expected)
  })
})
