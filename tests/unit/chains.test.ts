import { describe, expect, it } from 'vitest'
import { getAddress, isAddress } from 'viem'

import {
  CHAINS,
  CHAIN_KEYS,
  EXECUTABLE_CHAIN_KEYS,
  chainsWithToken,
  explorerAddressUrl,
  explorerTxUrl,
  findToken,
  getChain,
  getChainById,
  getTokensForChain,
  resolveChain,
  TOKENS,
} from '@/lib/chains/registry'

describe('chain registry', () => {
  it('exposes a definition for every key', () => {
    for (const key of CHAIN_KEYS) {
      const chain = CHAINS[key]
      expect(chain, key).toBeDefined()
      expect(chain?.key).toBe(key)
      expect(chain?.name.length).toBeGreaterThan(0)
      expect(chain?.aliases.length).toBeGreaterThan(0)
    }
  })

  it('gives every EVM chain a unique chain id', () => {
    const ids = CHAIN_KEYS.map((key) => CHAINS[key]?.chainId).filter(
      (id): id is number => typeof id === 'number',
    )
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('marks Solana plan-only, because ZeFi holds no Solana connection', () => {
    expect(CHAINS.solana?.capability).toBe('plan-only')
    expect(EXECUTABLE_CHAIN_KEYS).not.toContain('solana')
  })

  it('only lists EVM chains as executable', () => {
    for (const key of EXECUTABLE_CHAIN_KEYS) {
      expect(CHAINS[key]?.family).toBe('evm')
      expect(typeof CHAINS[key]?.chainId).toBe('number')
    }
  })

  describe('resolveChain', () => {
    it.each([
      ['ethereum', 'ethereum'],
      ['ETH', 'ethereum'],
      ['Mainnet', 'ethereum'],
      ['base', 'base'],
      ['Arbitrum One', 'arbitrum'],
      ['op mainnet', 'optimism'],
      ['MATIC', 'polygon'],
      ['solana', 'solana'],
    ])('resolves %s to %s', (input, expected) => {
      expect(resolveChain(input)?.key).toBe(expected)
    })

    it('returns null for anything not in the registry', () => {
      expect(resolveChain('avalanche')).toBeNull()
      expect(resolveChain('')).toBeNull()
      expect(resolveChain(null)).toBeNull()
      expect(resolveChain('   ')).toBeNull()
    })
  })

  it('looks chains up by id', () => {
    expect(getChainById(8453)?.key).toBe('base')
    expect(getChainById(1)?.key).toBe('ethereum')
    expect(getChainById(999_999)).toBeNull()
    expect(getChainById(null)).toBeNull()
  })

  it('builds explorer links', () => {
    const hash = `0x${'a'.repeat(64)}`
    expect(explorerTxUrl('base', hash)).toBe(`https://basescan.org/tx/${hash}`)
    expect(explorerAddressUrl('ethereum', '0xabc')).toBe('https://etherscan.io/address/0xabc')
    // Solana explorers use a different path for accounts.
    expect(explorerAddressUrl('solana', 'abc')).toBe('https://solscan.io/account/abc')
    expect(explorerTxUrl('nowhere', hash)).toBeNull()
  })
})

describe('asset registry', () => {
  /**
   * The single most valuable test in this file: a mistyped contract address is
   * a loss of funds, and EIP-55 checksums catch the overwhelming majority of
   * typos. This fails the build rather than reaching a user.
   */
  it('stores every EVM token address checksummed', () => {
    const evmTokens = TOKENS.filter(
      (token) => token.address !== null && CHAINS[token.chainKey]?.family === 'evm',
    )
    expect(evmTokens.length).toBeGreaterThan(10)

    for (const token of evmTokens) {
      const address = token.address as string
      expect(isAddress(address, { strict: false }), `${token.chainKey}/${token.symbol}`).toBe(true)
      expect(getAddress(address), `${token.chainKey}/${token.symbol} is not checksummed`).toBe(address)
    }
  })

  it('gives every token a chain that exists', () => {
    for (const token of TOKENS) {
      expect(CHAINS[token.chainKey], `${token.symbol} references ${token.chainKey}`).toBeDefined()
    }
  })

  it('leaves exactly one native asset per chain, with no contract address', () => {
    for (const key of CHAIN_KEYS) {
      const natives = getTokensForChain(key).filter((token) => token.kind === 'native')
      expect(natives.length, key).toBe(1)
      expect(natives[0]?.address, key).toBeNull()
      expect(natives[0]?.symbol, key).toBe(CHAINS[key]?.nativeCurrency.symbol)
    }
  })

  it('uses six decimals for USDC everywhere it is listed', () => {
    for (const token of TOKENS.filter((item) => item.symbol === 'USDC')) {
      expect(token.decimals, token.chainKey).toBe(6)
    }
  })

  it('never lists the same symbol twice on one chain', () => {
    for (const key of CHAIN_KEYS) {
      const symbols = getTokensForChain(key).map((token) => token.symbol)
      expect(new Set(symbols).size, key).toBe(symbols.length)
    }
  })

  describe('findToken', () => {
    it('finds a token case-insensitively via a chain alias', () => {
      expect(findToken('base', 'usdc')?.address).toBe('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913')
      expect(findToken('ETH', 'DAI')?.decimals).toBe(18)
    })

    it('returns null rather than guessing', () => {
      // DAI is not in the registry on Base — the planner must ask, not assume.
      expect(findToken('base', 'DAI')).toBeNull()
      expect(findToken('base', 'NOTATOKEN')).toBeNull()
      expect(findToken(null, 'USDC')).toBeNull()
      expect(findToken('base', null)).toBeNull()
    })
  })

  it('lists every chain a symbol exists on', () => {
    const keys = chainsWithToken('USDC').map((chain) => chain.key)
    expect(keys).toContain('ethereum')
    expect(keys).toContain('base')
    expect(keys).toContain('solana')
    expect(chainsWithToken('NOTATOKEN')).toEqual([])
  })

  it('resolves the native currency of a chain that has no getChain entry to null', () => {
    expect(getChain('does-not-exist')).toBeNull()
    expect(getChain(undefined)).toBeNull()
  })
})

describe('demo fixtures', () => {
  it('checksums every address the fixtures put in front of a user', async () => {
    const { HERO_PLAN, TRANSFER_PLAN, DEMO_WALLET } = await import('@/lib/demo/fixtures')

    const candidates = [
      DEMO_WALLET.address,
      ...[HERO_PLAN, TRANSFER_PLAN].flatMap((plan) => [
        ...plan.actions.flatMap((action) => [action.contractAddress, action.recipient]),
        ...plan.approvals.map((approval) => approval.tokenAddress),
      ]),
    ].filter((value): value is string => typeof value === 'string' && value.startsWith('0x'))

    expect(candidates.length).toBeGreaterThan(3)
    for (const address of candidates) {
      expect(isAddress(address, { strict: false }), address).toBe(true)
      expect(getAddress(address), `${address} is not EIP-55 checksummed`).toBe(address)
    }
  })
})
