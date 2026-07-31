import { describe, expect, it } from 'vitest'

import {
  classifyIntent,
  extractAmount,
  extractAssetMentions,
  extractChainMentions,
  extractIntentFields,
  extractPriority,
  extractRecipient,
  extractSlippage,
} from '@/lib/intent/classify'

const ADDRESS = '0x4E8F2A1b9C7D3e5f6A0B1C2d3E4f5a6B7c8D9E0F'

describe('classifyIntent', () => {
  it.each([
    ['Move $2,000 of USDC from Base to Solana using the safest route.', 'BRIDGE'],
    ['Create a plan to move 500 USDC from Ethereum to Base.', 'BRIDGE'],
    ['Bridge 1 ETH to Arbitrum', 'BRIDGE'],
    [`Send 250 USDC to ${ADDRESS} on Base`, 'SEND'],
    ['Swap 1 ETH for USDC', 'SWAP'],
    ['Revoke my USDC approval', 'APPROVE'],
    ['What approvals would this transaction require?', 'APPROVE'],
    ['Explain what is in my wallet.', 'PORTFOLIO_QUERY'],
    ['How much stablecoin exposure do I have?', 'PORTFOLIO_QUERY'],
    ['What is a rollup?', 'EXPLAIN'],
    ['Open Routefold and analyze my protocol’s expansion options.', 'ROUTEFOLD_ANALYSIS'],
    ['Which chain should we launch on next?', 'ROUTEFOLD_ANALYSIS'],
    ['Explain this contract interaction before I sign.', 'CONTRACT_INTERACTION'],
  ])('classifies %j as %s', (input, expected) => {
    expect(classifyIntent(input).intentType).toBe(expected)
  })

  it('treats a movement between two named chains as a bridge, whatever the verb', () => {
    // "move" alone scores as SEND; two distinct chains must outweigh it.
    expect(classifyIntent('move 100 USDC from base to arbitrum').intentType).toBe('BRIDGE')
    expect(classifyIntent('get my USDC from polygon over to optimism').intentType).toBe('BRIDGE')
  })

  it('treats a movement to an address on one chain as a send', () => {
    expect(classifyIntent(`move 1 ETH to ${ADDRESS}`).intentType).toBe('SEND')
  })

  it('reports low confidence for empty input', () => {
    const result = classifyIntent('')
    expect(result.intentType).toBe('UNKNOWN')
    expect(result.confidence).toBe(0)
  })

  it('keeps confidence within bounds and returns alternatives', () => {
    const result = classifyIntent('swap and bridge and send my tokens somewhere')
    expect(result.confidence).toBeGreaterThan(0)
    expect(result.confidence).toBeLessThanOrEqual(0.95)
    expect(Array.isArray(result.alternatives)).toBe(true)
  })

  it('is less confident when several patterns compete', () => {
    const clear = classifyIntent('Bridge 100 USDC from Base to Arbitrum')
    const muddy = classifyIntent('explain how I would swap and then bridge and send this')
    expect(muddy.confidence).toBeLessThan(clear.confidence)
  })
})

describe('extractChainMentions', () => {
  it('returns chains in order of appearance, without duplicates', () => {
    expect(extractChainMentions('from Base to Solana via Base')).toEqual(['base', 'solana'])
  })

  it('does not match a chain name inside another word', () => {
    // "based" must not register as Base.
    expect(extractChainMentions('this is based on nothing')).toEqual([])
    expect(extractChainMentions('optimistically speaking')).toEqual([])
  })
})

describe('extractAssetMentions', () => {
  it('finds known symbols in order', () => {
    expect(extractAssetMentions('swap 1 ETH for USDC')).toEqual(['ETH', 'USDC'])
  })

  it('ignores symbols embedded in longer words', () => {
    expect(extractAssetMentions('ETHEREAL')).toEqual([])
  })
})

describe('extractAmount', () => {
  it.each([
    ['$2,000', { value: '2000', unit: 'usd' }],
    ['2000 dollars', { value: '2000', unit: 'usd' }],
    ['500 USDC', { value: '500', unit: 'token' }],
    ['0.5 ETH', { value: '0.5', unit: 'token' }],
    ['25%', { value: '25', unit: 'percent' }],
    ['half of it', { value: '50', unit: 'percent' }],
    ['all of it', { value: '100', unit: 'max' }],
    ['everything', { value: '100', unit: 'max' }],
  ])('parses %j', (input, expected) => {
    expect(extractAmount(input)).toEqual(expected)
  })

  it('returns null when no amount is present', () => {
    expect(extractAmount('bridge my USDC to Base')).toBeNull()
  })

  it('never invents an amount from a bare number with an unknown unit', () => {
    expect(extractAmount('send 42 widgets')).toBeNull()
  })
})

describe('field extraction', () => {
  it('extracts a recipient address verbatim', () => {
    expect(extractRecipient(`send to ${ADDRESS} now`)).toBe(ADDRESS)
  })

  it('extracts a name without resolving it', () => {
    expect(extractRecipient('send to vitalik.eth')).toBe('vitalik.eth')
  })

  it('returns null when there is no recipient', () => {
    expect(extractRecipient('send some USDC')).toBeNull()
  })

  it('extracts slippage within bounds', () => {
    expect(extractSlippage('with slippage of 1.5%')).toBe(1.5)
    expect(extractSlippage('slippage 0.5')).toBe(0.5)
    expect(extractSlippage('slippage of 90%')).toBeNull()
    expect(extractSlippage('no slippage mentioned here')).toBeNull()
  })

  it.each([
    ['use the safest route', 'safest'],
    ['find the cheapest way', 'cheapest'],
    ['do it as fast as possible', 'fastest'],
    ['just move it', null],
  ])('extracts priority from %j', (input, expected) => {
    expect(extractPriority(input)).toBe(expected)
  })
})

describe('extractIntentFields', () => {
  it('builds the full deterministic seed for the hero prompt', () => {
    const fields = extractIntentFields('Move $2,000 of USDC from Base to Solana using the safest route.')

    expect(fields.classification.intentType).toBe('BRIDGE')
    expect(fields.sourceNetwork).toBe('base')
    expect(fields.destinationNetwork).toBe('solana')
    expect(fields.sourceAsset).toBe('USDC')
    expect(fields.destinationAsset).toBe('USDC')
    expect(fields.amount).toEqual({ value: '2000', unit: 'usd' })
    expect(fields.priority).toBe('safest')
    expect(fields.resolvedSourceChain?.key).toBe('base')
    expect(fields.resolvedDestinationChain?.key).toBe('solana')
  })

  it('leaves the destination network null for a same-chain send', () => {
    const fields = extractIntentFields(`Send 250 USDC to ${ADDRESS} on Base`)
    expect(fields.classification.intentType).toBe('SEND')
    expect(fields.sourceNetwork).toBe('base')
    expect(fields.destinationNetwork).toBeNull()
    expect(fields.recipient).toBe(ADDRESS)
  })

  it('extracts both assets for a swap', () => {
    const fields = extractIntentFields('Swap 1 ETH for USDC on Base')
    expect(fields.classification.intentType).toBe('SWAP')
    expect(fields.sourceAsset).toBe('ETH')
    expect(fields.destinationAsset).toBe('USDC')
  })
})
