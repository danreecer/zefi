/**
 * Chain and asset registry.
 *
 * This is the deterministic ground truth for everything the AI layer is allowed
 * to reference. The model may *name* a chain or an asset; it may never invent an
 * address, a decimal count or a chain id. Anything not resolvable here becomes a
 * missing-information prompt rather than a guess.
 *
 * Token addresses are curated and stored EIP-55 checksummed. `tests/unit/
 * chains.test.ts` asserts every address in this file is a valid checksummed
 * address, so a typo fails the build rather than reaching a user.
 */

export type ChainFamily = 'evm' | 'svm'

/** What ZeFi can do with a chain today, as opposed to what it can describe. */
export type ChainCapability =
  /** Balance reads and transfer execution via a connected wallet. */
  | 'read-and-execute'
  /** Balance reads only; execution needs a provider integration. */
  | 'read-only'
  /** Recognised for planning, but ZeFi holds no live connection. */
  | 'plan-only'

export interface ChainDefinition {
  key: string
  name: string
  shortName: string
  family: ChainFamily
  /** EVM chain id. `null` for non-EVM chains. */
  chainId: number | null
  capability: ChainCapability
  nativeCurrency: { symbol: string; name: string; decimals: number }
  explorerUrl: string
  /** Appended to `explorerUrl` to build a transaction link. */
  explorerTxPath: string
  /** Lower-case aliases used when resolving a chain from natural language. */
  aliases: string[]
  /** Typical finality window, used for honest time estimates. */
  typicalBlockSeconds: number
  accent: string
}

export const CHAINS: Record<string, ChainDefinition> = {
  ethereum: {
    key: 'ethereum',
    name: 'Ethereum',
    shortName: 'Ethereum',
    family: 'evm',
    chainId: 1,
    capability: 'read-and-execute',
    nativeCurrency: { symbol: 'ETH', name: 'Ether', decimals: 18 },
    explorerUrl: 'https://etherscan.io',
    explorerTxPath: '/tx/',
    aliases: ['ethereum', 'eth', 'mainnet', 'ethereum mainnet', 'l1'],
    typicalBlockSeconds: 12,
    accent: '#627EEA',
  },
  base: {
    key: 'base',
    name: 'Base',
    shortName: 'Base',
    family: 'evm',
    chainId: 8453,
    capability: 'read-and-execute',
    nativeCurrency: { symbol: 'ETH', name: 'Ether', decimals: 18 },
    explorerUrl: 'https://basescan.org',
    explorerTxPath: '/tx/',
    aliases: ['base', 'base mainnet', 'coinbase l2'],
    typicalBlockSeconds: 2,
    accent: '#0052FF',
  },
  arbitrum: {
    key: 'arbitrum',
    name: 'Arbitrum One',
    shortName: 'Arbitrum',
    family: 'evm',
    chainId: 42161,
    capability: 'read-and-execute',
    nativeCurrency: { symbol: 'ETH', name: 'Ether', decimals: 18 },
    explorerUrl: 'https://arbiscan.io',
    explorerTxPath: '/tx/',
    aliases: ['arbitrum', 'arbitrum one', 'arb', 'arbitrum mainnet'],
    typicalBlockSeconds: 1,
    accent: '#28A0F0',
  },
  optimism: {
    key: 'optimism',
    name: 'OP Mainnet',
    shortName: 'Optimism',
    family: 'evm',
    chainId: 10,
    capability: 'read-and-execute',
    nativeCurrency: { symbol: 'ETH', name: 'Ether', decimals: 18 },
    explorerUrl: 'https://optimistic.etherscan.io',
    explorerTxPath: '/tx/',
    aliases: ['optimism', 'op', 'op mainnet', 'optimism mainnet'],
    typicalBlockSeconds: 2,
    accent: '#FF0420',
  },
  polygon: {
    key: 'polygon',
    name: 'Polygon PoS',
    shortName: 'Polygon',
    family: 'evm',
    chainId: 137,
    capability: 'read-and-execute',
    nativeCurrency: { symbol: 'POL', name: 'Polygon Ecosystem Token', decimals: 18 },
    explorerUrl: 'https://polygonscan.com',
    explorerTxPath: '/tx/',
    aliases: ['polygon', 'matic', 'polygon pos', 'polygon mainnet'],
    typicalBlockSeconds: 2,
    accent: '#8247E5',
  },
  solana: {
    key: 'solana',
    name: 'Solana',
    shortName: 'Solana',
    family: 'svm',
    chainId: null,
    // ZeFi understands Solana well enough to plan a route to it, but holds no
    // Solana wallet connection — so it is honest about being plan-only.
    capability: 'plan-only',
    nativeCurrency: { symbol: 'SOL', name: 'Solana', decimals: 9 },
    explorerUrl: 'https://solscan.io',
    explorerTxPath: '/tx/',
    aliases: ['solana', 'sol', 'svm'],
    typicalBlockSeconds: 1,
    accent: '#14F195',
  },
}

export const CHAIN_KEYS = Object.keys(CHAINS)

/** Chains a connected EVM wallet can transact on today. */
export const EXECUTABLE_CHAIN_KEYS = CHAIN_KEYS.filter(
  (key) => CHAINS[key]?.capability === 'read-and-execute',
)

export const EVM_CHAIN_IDS = CHAIN_KEYS.map((key) => CHAINS[key]?.chainId).filter(
  (id): id is number => typeof id === 'number',
)

export function getChain(key: string | null | undefined): ChainDefinition | null {
  if (!key) return null
  return CHAINS[key.toLowerCase()] ?? null
}

export function getChainById(chainId: number | null | undefined): ChainDefinition | null {
  if (typeof chainId !== 'number') return null
  return CHAIN_KEYS.map((key) => CHAINS[key]).find((chain) => chain?.chainId === chainId) ?? null
}

/** Resolves a free-text chain reference to a registry key, or `null`. */
export function resolveChain(input: string | null | undefined): ChainDefinition | null {
  if (!input) return null
  const needle = input.trim().toLowerCase()
  if (!needle) return null
  if (CHAINS[needle]) return CHAINS[needle] ?? null
  for (const key of CHAIN_KEYS) {
    const chain = CHAINS[key]
    if (chain && chain.aliases.includes(needle)) return chain
  }
  return null
}

export function explorerTxUrl(chainKey: string, hash: string): string | null {
  const chain = getChain(chainKey)
  if (!chain) return null
  return `${chain.explorerUrl}${chain.explorerTxPath}${hash}`
}

export function explorerAddressUrl(chainKey: string, address: string): string | null {
  const chain = getChain(chainKey)
  if (!chain) return null
  const path = chain.family === 'svm' ? '/account/' : '/address/'
  return `${chain.explorerUrl}${path}${address}`
}

/* ── Assets ────────────────────────────────────────────────────────────────── */

export interface TokenDefinition {
  symbol: string
  name: string
  decimals: number
  /** `null` marks the chain's native currency, which has no contract. */
  address: string | null
  chainKey: string
  /** Stablecoins get their own treatment in portfolio explanations. */
  kind: 'native' | 'stablecoin' | 'wrapped' | 'asset'
  coingeckoId?: string
}

const t = (
  chainKey: string,
  symbol: string,
  name: string,
  decimals: number,
  address: string | null,
  kind: TokenDefinition['kind'],
  coingeckoId?: string,
): TokenDefinition => ({ chainKey, symbol, name, decimals, address, kind, coingeckoId })

export const TOKENS: TokenDefinition[] = [
  // ── Ethereum ───────────────────────────────────────────────────────────────
  t('ethereum', 'ETH', 'Ether', 18, null, 'native', 'ethereum'),
  t('ethereum', 'USDC', 'USD Coin', 6, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'stablecoin', 'usd-coin'),
  t('ethereum', 'USDT', 'Tether USD', 6, '0xdAC17F958D2ee523a2206206994597C13D831ec7', 'stablecoin', 'tether'),
  t('ethereum', 'DAI', 'Dai Stablecoin', 18, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 'stablecoin', 'dai'),
  t('ethereum', 'WETH', 'Wrapped Ether', 18, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 'wrapped', 'weth'),
  t('ethereum', 'WBTC', 'Wrapped Bitcoin', 8, '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', 'asset', 'wrapped-bitcoin'),

  // ── Base ───────────────────────────────────────────────────────────────────
  t('base', 'ETH', 'Ether', 18, null, 'native', 'ethereum'),
  t('base', 'USDC', 'USD Coin', 6, '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', 'stablecoin', 'usd-coin'),
  t('base', 'WETH', 'Wrapped Ether', 18, '0x4200000000000000000000000000000000000006', 'wrapped', 'weth'),

  // ── Arbitrum ───────────────────────────────────────────────────────────────
  t('arbitrum', 'ETH', 'Ether', 18, null, 'native', 'ethereum'),
  t('arbitrum', 'USDC', 'USD Coin', 6, '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', 'stablecoin', 'usd-coin'),
  t('arbitrum', 'USDT', 'Tether USD', 6, '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', 'stablecoin', 'tether'),
  t('arbitrum', 'WETH', 'Wrapped Ether', 18, '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', 'wrapped', 'weth'),

  // ── Optimism ───────────────────────────────────────────────────────────────
  t('optimism', 'ETH', 'Ether', 18, null, 'native', 'ethereum'),
  t('optimism', 'USDC', 'USD Coin', 6, '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', 'stablecoin', 'usd-coin'),
  t('optimism', 'WETH', 'Wrapped Ether', 18, '0x4200000000000000000000000000000000000006', 'wrapped', 'weth'),

  // ── Polygon ────────────────────────────────────────────────────────────────
  t('polygon', 'POL', 'Polygon Ecosystem Token', 18, null, 'native', 'matic-network'),
  t('polygon', 'USDC', 'USD Coin', 6, '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', 'stablecoin', 'usd-coin'),
  t('polygon', 'USDT', 'Tether USD', 6, '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', 'stablecoin', 'tether'),
  t('polygon', 'WETH', 'Wrapped Ether', 18, '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', 'wrapped', 'weth'),

  // ── Solana (plan-only; addresses are SPL mints, not EVM) ───────────────────
  t('solana', 'SOL', 'Solana', 9, null, 'native', 'solana'),
  t('solana', 'USDC', 'USD Coin', 6, 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 'stablecoin', 'usd-coin'),
]

export function getTokensForChain(chainKey: string): TokenDefinition[] {
  return TOKENS.filter((token) => token.chainKey === chainKey)
}

export function findToken(chainKey: string | null | undefined, symbol: string | null | undefined) {
  if (!chainKey || !symbol) return null
  const chain = resolveChain(chainKey)
  if (!chain) return null
  const needle = symbol.trim().toUpperCase()
  return TOKENS.find((token) => token.chainKey === chain.key && token.symbol === needle) ?? null
}

/** Every chain on which a symbol is known — used to disambiguate "USDC where?". */
export function chainsWithToken(symbol: string): ChainDefinition[] {
  const needle = symbol.trim().toUpperCase()
  const keys = new Set(TOKENS.filter((token) => token.symbol === needle).map((token) => token.chainKey))
  return [...keys].map((key) => CHAINS[key]).filter((chain): chain is ChainDefinition => Boolean(chain))
}

export const KNOWN_SYMBOLS = [...new Set(TOKENS.map((token) => token.symbol))].sort()

/** Minimal ERC-20 surface ZeFi uses for reads and transfers. */
export const ERC20_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

/** `type(uint256).max` — the value wallets display as an unlimited approval. */
export const UNLIMITED_APPROVAL =
  115792089237316195423570985008687907853269984665640564039457584007913129639935n
