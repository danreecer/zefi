import { CHAIN_KEYS, CHAINS, KNOWN_SYMBOLS, resolveChain } from '@/lib/chains/registry'
import type { Amount, IntentType } from './schema'

/**
 * Deterministic intent classification.
 *
 * This runs *before* the model on every request and serves three purposes:
 *
 *  1. It gives the AI stage a prior, which measurably reduces mislabelling of
 *     ambiguous phrasings like "move" (send vs bridge).
 *  2. It is the complete classifier when no AI provider is configured, so the
 *     product still behaves sensibly in demo mode.
 *  3. It is unit-testable, unlike the model, so classification behaviour is
 *     pinned by the test suite rather than by vibes.
 *
 * It never produces addresses or amounts that were not literally present in the
 * user's text.
 */

interface Signal {
  type: IntentType
  score: number
}

const RE = {
  evmAddress: /\b0x[a-fA-F0-9]{40}\b/,
  ensName: /\b[a-z0-9][a-z0-9-]{1,62}\.(eth|base|cb\.id)\b/i,
  solanaAddress: /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/,
  usdAmount: /(?:\$|\busd\s*)\s?([0-9][0-9,]*(?:\.[0-9]+)?)|\b([0-9][0-9,]*(?:\.[0-9]+)?)\s*(?:usd|dollars?)\b/i,
  tokenAmount: /\b([0-9][0-9,]*(?:\.[0-9]+)?)\s*([A-Za-z]{2,10})\b/,
  percent: /\b([0-9]{1,3}(?:\.[0-9]+)?)\s*(?:%|\bpercent\b)/i,
  half: /\bhalf\b/i,
  all: /\b(all|everything|entire balance|max|maximum)\b/i,
  slippage: /\bslippage\s*(?:of|:)?\s*([0-9]+(?:\.[0-9]+)?)\s*%?/i,
} as const

const KEYWORDS: Array<{ type: IntentType; terms: RegExp; score: number }> = [
  { type: 'ROUTEFOLD_ANALYSIS', terms: /\broutefold\b/i, score: 10 },
  {
    type: 'ROUTEFOLD_ANALYSIS',
    terms: /\b(which chain should (we|i) (launch|deploy|expand)|expansion (options|strategy|plan)|multichain (strategy|expansion)|next chain|chain[- ]fit|digital twin)\b/i,
    score: 7,
  },
  { type: 'BRIDGE', terms: /\b(bridge|bridging|cross[- ]?chain)\b/i, score: 8 },
  { type: 'SWAP', terms: /\b(swap|trade|convert|exchange)\b/i, score: 7 },
  { type: 'SEND', terms: /\b(send|transfer|pay|withdraw to)\b/i, score: 6 },
  { type: 'SEND', terms: /\bmove\b/i, score: 4 },
  { type: 'APPROVE', terms: /\b(approve|approvals?|allowances?|revoke|spending cap)\b/i, score: 7 },
  {
    type: 'COMPARE_ROUTES',
    terms: /\b(compare|cheapest route|best route|which route|route options|safest route|fastest route)\b/i,
    score: 5,
  },
  {
    type: 'PORTFOLIO_QUERY',
    terms: /\b(my wallet|my balance|my portfolio|my holdings|my positions|what (do|am) i (hold|holding|own)|what'?s in my wallet|exposure|allocation|net worth)\b/i,
    score: 8,
  },
  {
    type: 'CONTRACT_INTERACTION',
    terms: /\b(contract interaction|this contract|calldata|before i sign|explain this transaction|decode)\b/i,
    score: 7,
  },
  {
    type: 'EXPLAIN',
    terms: /\b(what is|what are|explain|how does|how do|why does|difference between|tell me about)\b/i,
    score: 5,
  },
]

/** Chain names mentioned in the text, in the order they appear. */
export function extractChainMentions(text: string): string[] {
  const lower = text.toLowerCase()
  const hits: Array<{ key: string; index: number }> = []

  for (const key of CHAIN_KEYS) {
    const chain = CHAINS[key]
    if (!chain) continue
    for (const alias of chain.aliases) {
      // Word-boundary match so "base" in "based on" does not count.
      const pattern = new RegExp(`(?<![a-z0-9])${escapeRegex(alias)}(?![a-z0-9])`, 'g')
      let match: RegExpExecArray | null
      while ((match = pattern.exec(lower)) !== null) {
        hits.push({ key, index: match.index })
      }
    }
  }

  hits.sort((a, b) => a.index - b.index)
  const ordered: string[] = []
  for (const hit of hits) {
    if (!ordered.includes(hit.key)) ordered.push(hit.key)
  }
  return ordered
}

/** Known asset symbols mentioned in the text, in order of appearance. */
export function extractAssetMentions(text: string): string[] {
  const found: Array<{ symbol: string; index: number }> = []
  for (const symbol of KNOWN_SYMBOLS) {
    const pattern = new RegExp(`(?<![A-Za-z0-9])${escapeRegex(symbol)}(?![A-Za-z0-9])`, 'gi')
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      found.push({ symbol, index: match.index })
    }
  }
  found.sort((a, b) => a.index - b.index)
  const ordered: string[] = []
  for (const hit of found) {
    if (!ordered.includes(hit.symbol)) ordered.push(hit.symbol)
  }
  return ordered
}

export function extractRecipient(text: string): string | null {
  const evm = text.match(RE.evmAddress)
  if (evm?.[0]) return evm[0]
  const ens = text.match(RE.ensName)
  if (ens?.[0]) return ens[0]
  return null
}

export function extractAmount(text: string): Amount | null {
  if (RE.all.test(text)) return { value: '100', unit: 'max' }
  if (RE.half.test(text)) return { value: '50', unit: 'percent' }

  const percent = text.match(RE.percent)
  if (percent?.[1]) return { value: normaliseNumber(percent[1]), unit: 'percent' }

  const usd = text.match(RE.usdAmount)
  const usdValue = usd?.[1] ?? usd?.[2]
  if (usdValue) return { value: normaliseNumber(usdValue), unit: 'usd' }

  // A bare number immediately followed by a known symbol is a token amount.
  const tokenMatches = [...text.matchAll(new RegExp(RE.tokenAmount, 'g'))]
  for (const match of tokenMatches) {
    const [, value, maybeSymbol] = match
    if (!value || !maybeSymbol) continue
    if (KNOWN_SYMBOLS.includes(maybeSymbol.toUpperCase())) {
      return { value: normaliseNumber(value), unit: 'token' }
    }
  }
  return null
}

export function extractSlippage(text: string): number | null {
  const match = text.match(RE.slippage)
  if (!match?.[1]) return null
  const value = Number(match[1])
  return Number.isFinite(value) && value >= 0 && value <= 50 ? value : null
}

export function extractPriority(text: string): 'safest' | 'cheapest' | 'fastest' | 'balanced' | null {
  const lower = text.toLowerCase()
  if (/\b(safest|safe|lowest risk|most secure|secure)\b/.test(lower)) return 'safest'
  if (/\b(cheapest|lowest fee|lowest cost|minimi[sz]e (fees|cost))\b/.test(lower)) return 'cheapest'
  if (/\b(fastest|quickest|asap|as fast as)\b/.test(lower)) return 'fastest'
  return null
}

export interface Classification {
  intentType: IntentType
  confidence: number
  /** Ordered runners-up, useful for logging and for the AI stage's prior. */
  alternatives: IntentType[]
  chainMentions: string[]
  assetMentions: string[]
}

export function classifyIntent(text: string): Classification {
  const input = text.trim()
  const chainMentions = extractChainMentions(input)
  const assetMentions = extractAssetMentions(input)
  const recipient = extractRecipient(input)

  const signals: Signal[] = []
  for (const rule of KEYWORDS) {
    if (rule.terms.test(input)) signals.push({ type: rule.type, score: rule.score })
  }

  // Two distinct chains named in a movement request means a bridge, whatever
  // verb the user reached for. This is the "move X from Base to Solana" case.
  const movementVerb = /\b(move|send|transfer|bridge|get|put|shift)\b/i.test(input)
  if (movementVerb && chainMentions.length >= 2) {
    signals.push({ type: 'BRIDGE', score: 9 })
  }

  // A movement request naming one chain and an explicit recipient is a send.
  if (movementVerb && recipient && chainMentions.length <= 1) {
    signals.push({ type: 'SEND', score: 8 })
  }

  // Two different assets on one chain with a movement verb reads as a swap.
  if (assetMentions.length >= 2 && chainMentions.length <= 1 && /\b(swap|convert|trade|into|for)\b/i.test(input)) {
    signals.push({ type: 'SWAP', score: 7 })
  }

  if (signals.length === 0) {
    return {
      intentType: input.length > 0 ? 'EXPLAIN' : 'UNKNOWN',
      confidence: input.length > 0 ? 0.3 : 0,
      alternatives: [],
      chainMentions,
      assetMentions,
    }
  }

  const totals = new Map<IntentType, number>()
  for (const signal of signals) {
    totals.set(signal.type, (totals.get(signal.type) ?? 0) + signal.score)
  }

  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1])
  const top = ranked[0]
  if (!top) {
    return { intentType: 'UNKNOWN', confidence: 0, alternatives: [], chainMentions, assetMentions }
  }

  const [intentType, topScore] = top
  const runnerUp = ranked[1]?.[1] ?? 0
  const total = ranked.reduce((sum, [, score]) => sum + score, 0)

  // Confidence blends share-of-signal with the margin over the runner-up, so a
  // request matching several competing patterns reports itself as uncertain.
  const share = topScore / total
  const margin = (topScore - runnerUp) / topScore
  const confidence = clamp(0.35 + share * 0.4 + margin * 0.25, 0, 0.95)

  return {
    intentType,
    confidence: Number(confidence.toFixed(2)),
    alternatives: ranked.slice(1, 3).map(([type]) => type),
    chainMentions,
    assetMentions,
  }
}

/**
 * Best-effort structured extraction without a model. Used verbatim in demo mode
 * and as the seed the AI stage refines.
 */
export function extractIntentFields(text: string) {
  const chains = extractChainMentions(text)
  const assets = extractAssetMentions(text)
  const classification = classifyIntent(text)

  const isCrossChain = classification.intentType === 'BRIDGE' && chains.length >= 2
  const sourceNetwork = chains[0] ?? null
  const destinationNetwork = isCrossChain ? (chains[1] ?? null) : null

  const sourceAsset = assets[0] ?? null
  const destinationAsset =
    classification.intentType === 'SWAP' ? (assets[1] ?? null) : isCrossChain ? sourceAsset : null

  return {
    classification,
    sourceNetwork,
    destinationNetwork,
    sourceAsset,
    destinationAsset,
    amount: extractAmount(text),
    recipient: extractRecipient(text),
    slippageTolerancePercent: extractSlippage(text),
    priority: extractPriority(text),
    resolvedSourceChain: resolveChain(sourceNetwork),
    resolvedDestinationChain: resolveChain(destinationNetwork),
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normaliseNumber(value: string): string {
  const cleaned = value.replace(/,/g, '')
  return /^\d+(\.\d+)?$/.test(cleaned) ? cleaned : '0'
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
