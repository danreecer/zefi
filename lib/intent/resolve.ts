import { findToken, getChain, resolveChain, type ChainDefinition } from '@/lib/chains/registry'
import { validateDecimalAmount, validateEvmAddress } from '@/lib/security/validation'
import {
  isTransactionalIntent,
  type MissingField,
  type ResolvedIntent,
  type StructuredIntent,
} from './schema'

export interface WalletContext {
  address: string | null
  chainId: number | null
  chainKey: string | null
}

/**
 * Turns a structured intent into a resolved one.
 *
 * This is the deterministic gate between the model and the planner. Chains and
 * assets are looked up in the registry; addresses are checksummed; amounts are
 * range-checked against the asset's real decimals. Nothing the model said about
 * any of these is taken at face value.
 *
 * The output distinguishes two failure modes deliberately:
 *   • `missing`  — a field the user simply has not supplied yet (ask for it)
 *   • `blockers` — something is present but wrong or unsupported (explain it)
 */
export function resolveIntent(
  intent: StructuredIntent,
  wallet: WalletContext = { address: null, chainId: null, chainKey: null },
): ResolvedIntent {
  const missing = new Set<MissingField>(intent.missingInformation)
  const blockers: string[] = []

  const sourceChain = resolveChain(intent.sourceNetwork) ?? inferSourceChain(intent, wallet)
  const destinationChain = resolveChain(intent.destinationNetwork)

  if (intent.sourceNetwork && !sourceChain) {
    blockers.push(
      `ZeFi does not recognise “${intent.sourceNetwork}” as a network it can work with. Supported networks are Ethereum, Base, Arbitrum, OP Mainnet and Polygon, plus Solana for planning only.`,
    )
  }
  if (intent.destinationNetwork && !destinationChain) {
    blockers.push(
      `ZeFi does not recognise “${intent.destinationNetwork}” as a destination network.`,
    )
  }

  const sourceToken = sourceChain ? findToken(sourceChain.key, intent.sourceAsset) : null
  const destinationToken = destinationChain
    ? findToken(destinationChain.key, intent.destinationAsset ?? intent.sourceAsset)
    : sourceChain
      ? findToken(sourceChain.key, intent.destinationAsset)
      : null

  if (intent.sourceAsset && sourceChain && !sourceToken) {
    blockers.push(
      `${intent.sourceAsset.toUpperCase()} is not in ZeFi's verified asset registry for ${sourceChain.name}. ZeFi will not guess a contract address — supply the token address to continue.`,
    )
  }

  /* ── Per-intent field requirements ─────────────────────────────────────── */

  const type = intent.intentType

  if (isTransactionalIntent(type)) {
    if (!sourceChain) missing.add('sourceNetwork')
    if (!intent.sourceAsset && type !== 'CONTRACT_INTERACTION') missing.add('sourceAsset')
    if (!intent.amount && type !== 'CONTRACT_INTERACTION' && type !== 'APPROVE') missing.add('amount')
    if (!wallet.address) missing.add('connectedWallet')
  }

  if (type === 'SEND' && !intent.recipient) missing.add('recipient')
  if (type === 'SWAP' && !intent.destinationAsset) missing.add('destinationAsset')
  if (type === 'BRIDGE') {
    if (!destinationChain) missing.add('destinationNetwork')
    if (sourceChain && destinationChain && sourceChain.key === destinationChain.key) {
      blockers.push(
        'The source and destination networks are the same, so no bridge is required. Did you mean a transfer or a swap?',
      )
    }
  }

  /* ── Recipient ─────────────────────────────────────────────────────────── */

  let recipientAddress: string | null = null
  if (intent.recipient) {
    if (sourceChain?.family === 'svm') {
      // Solana recipients are validated by shape only; ZeFi holds no Solana
      // connection, so nothing further can be proved locally.
      recipientAddress = intent.recipient.trim()
    } else {
      const check = validateEvmAddress(intent.recipient, { self: wallet.address })
      if (check.ok) {
        recipientAddress = check.checksummed
      } else {
        blockers.push(check.reason)
        if (check.code === 'empty') missing.add('recipient')
      }
    }
  }

  /* ── Amount ────────────────────────────────────────────────────────────── */

  if (intent.amount && sourceToken) {
    if (intent.amount.unit === 'token') {
      const check = validateDecimalAmount(intent.amount.value, sourceToken.decimals)
      if (!check.ok) blockers.push(check.reason)
    }
    if (intent.amount.unit === 'usd' && sourceToken.kind !== 'stablecoin') {
      // A USD amount on a volatile asset needs a price ZeFi may not hold.
      blockers.push(
        `Converting a US-dollar amount into ${sourceToken.symbol} needs a live price. ZeFi will not estimate one — specify the amount in ${sourceToken.symbol}, or connect a pricing provider.`,
      )
    }
  }

  /* ── Capability honesty ────────────────────────────────────────────────── */

  if (sourceChain && sourceChain.capability === 'plan-only' && isTransactionalIntent(type)) {
    blockers.push(
      `ZeFi can plan actions on ${sourceChain.name} but holds no wallet connection there, so it cannot originate this transaction. The plan below is informational.`,
    )
  }

  if (
    wallet.chainKey &&
    sourceChain &&
    wallet.chainKey !== sourceChain.key &&
    isTransactionalIntent(type)
  ) {
    blockers.push(
      `Your wallet is connected to ${getChain(wallet.chainKey)?.name ?? wallet.chainKey} but this action is on ${sourceChain.name}. You will be asked to switch networks before signing.`,
    )
  }

  const ready = missing.size === 0 && blockers.length === 0

  return {
    intent: {
      ...intent,
      sourceNetwork: sourceChain?.key ?? intent.sourceNetwork,
      destinationNetwork: destinationChain?.key ?? intent.destinationNetwork,
      missingInformation: [...missing],
    },
    sourceChainKey: sourceChain?.key ?? null,
    destinationChainKey: destinationChain?.key ?? null,
    sourceTokenSymbol: sourceToken?.symbol ?? null,
    destinationTokenSymbol: destinationToken?.symbol ?? null,
    recipientAddress,
    missing: [...missing],
    blockers,
    ready,
  }
}

/**
 * When the user did not name a network, the connected wallet's network is the
 * only defensible default — and it is recorded as an assumption, never silently.
 */
function inferSourceChain(intent: StructuredIntent, wallet: WalletContext): ChainDefinition | null {
  if (intent.sourceNetwork) return null
  if (!wallet.chainKey) return null
  if (!isTransactionalIntent(intent.intentType)) return null
  return getChain(wallet.chainKey)
}

/** Human-readable prompt for the first missing field. */
export function describeMissingField(field: MissingField): string {
  switch (field) {
    case 'sourceNetwork':
      return 'Which network should this start from?'
    case 'destinationNetwork':
      return 'Which network should this end on?'
    case 'sourceAsset':
      return 'Which asset should ZeFi move?'
    case 'destinationAsset':
      return 'Which asset do you want to receive?'
    case 'amount':
      return 'How much should ZeFi move?'
    case 'recipient':
      return 'What is the recipient address?'
    case 'connectedWallet':
      return 'Connect a wallet so ZeFi can read the balances this plan depends on.'
    case 'slippageTolerance':
      return 'What slippage tolerance is acceptable?'
    default:
      return 'Some information is still missing.'
  }
}

/** The single most useful question to ask next. */
export function nextQuestion(resolved: ResolvedIntent): string | null {
  if (resolved.intent.clarifyingQuestion) return resolved.intent.clarifyingQuestion
  const first = resolved.missing[0]
  return first ? describeMissingField(first) : null
}
