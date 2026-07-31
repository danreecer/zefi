import { BaseError } from 'viem'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const call = vi.fn()
const estimateGas = vi.fn()
const getGasPrice = vi.fn()
const publicClientFor = vi.fn()

vi.mock('@/lib/wallet/server-reads', () => ({
  publicClientFor: (key: string) => publicClientFor(key),
}))

const { TRANSFER_PLAN } = await import('@/lib/demo/fixtures')
const { RpcSimulationProvider } = await import('@/lib/simulation/rpc')

const WALLET = '0x7a3F2C8E5d1B4A6f9e0C3b7d2F5a8c1E4d6b9a0C'

/** A revert as viem reports one: a BaseError whose innermost name says so. */
class Reverted extends BaseError {
  override name = 'CallExecutionError'
  constructor(detail: string) {
    super(detail)
  }
}

function request(overrides: { address?: string | null } = {}) {
  return {
    plan: structuredClone(TRANSFER_PLAN),
    wallet: {
      address: overrides.address === undefined ? WALLET : overrides.address,
      chainId: 8453,
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  publicClientFor.mockReturnValue({ call, estimateGas, getGasPrice })
  call.mockResolvedValue({ data: '0x' })
  estimateGas.mockResolvedValue(52_000n)
  getGasPrice.mockResolvedValue(15_000_000n)
})

describe('RpcSimulationProvider', () => {
  it('reports a deep pass only after the call actually executed', async () => {
    const result = await new RpcSimulationProvider().simulate(request())

    expect(call).toHaveBeenCalledTimes(1)
    expect(result.deepSimulation).toBe(true)
    expect(result.status).toBe('passed')
    expect(result.provider).toBe('rpc')

    const execution = result.checks.find((c) => c.id === 'execution')
    expect(execution?.outcome).toBe('pass')
  })

  it('sends the transaction to the token contract, not the recipient', async () => {
    await new RpcSimulationProvider().simulate(request())

    const args = call.mock.calls[0]?.[0]
    // USDC on Base — the call must target the contract and carry transfer calldata.
    expect(args.to.toLowerCase()).not.toBe('0x4e8f2a1b9c7d3e5f6a0b1c2d3e4f5a6b7c8d9e0f')
    expect(args.data).toMatch(/^0xa9059cbb/) // transfer(address,uint256)
    expect(args.value).toBe(0n)
    expect(args.account).toBe(WALLET)
  })

  it('surfaces a revert as a failure, with the contract’s own reason', async () => {
    call.mockRejectedValue(new Reverted('execution reverted: ERC20: transfer amount exceeds balance'))

    const result = await new RpcSimulationProvider().simulate(request())

    expect(result.status).toBe('failed')
    // It did execute — the chain rejected it. That is a real deep result.
    expect(result.deepSimulation).toBe(true)
    const execution = result.checks.find((c) => c.id === 'execution')
    expect(execution?.outcome).toBe('fail')
    expect(execution?.detail).toMatch(/transfer amount exceeds balance/i)
  })

  it('never claims a deep simulation when the RPC could not be reached', async () => {
    call.mockRejectedValue(new Error('fetch failed'))

    const result = await new RpcSimulationProvider().simulate(request())

    expect(result.deepSimulation).toBe(false)
    expect(result.status).toBe('local_only')
    const execution = result.checks.find((c) => c.id === 'execution')
    expect(execution?.outcome).toBe('skipped')
    expect(execution?.detail).toMatch(/could not be reached/i)
  })

  it('skips execution without a sender rather than inventing one', async () => {
    const result = await new RpcSimulationProvider().simulate(request({ address: null }))

    expect(call).not.toHaveBeenCalled()
    expect(result.deepSimulation).toBe(false)
    const execution = result.checks.find((c) => c.id === 'execution')
    expect(execution?.outcome).toBe('skipped')
    expect(execution?.detail).toMatch(/no wallet is connected/i)
  })

  it('does not spend an RPC round trip on a plan that already failed locally', async () => {
    const input = request()
    // An unlimited approval is a hard local failure.
    input.plan.approvals = [
      {
        chainKey: 'base',
        asset: 'USDC',
        tokenAddress: null,
        spenderLabel: 'Test spender',
        spenderAddress: WALLET,
        amount: null,
        unlimited: true,
      },
    ]

    const result = await new RpcSimulationProvider().simulate(input)

    expect(call).not.toHaveBeenCalled()
    expect(result.status).toBe('failed')
    expect(result.deepSimulation).toBe(false)
  })

  it('still reports a pass when gas estimation fails after a successful call', async () => {
    estimateGas.mockRejectedValue(new Error('estimate unavailable'))

    const result = await new RpcSimulationProvider().simulate(request())

    expect(result.status).toBe('passed')
    expect(result.deepSimulation).toBe(true)
    const execution = result.checks.find((c) => c.id === 'execution')
    expect(execution?.outcome).toBe('pass')
  })
})
