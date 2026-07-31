import { getAddress, isAddress } from 'viem'
import { z } from 'zod'

/**
 * Deterministic validation used at every trust boundary.
 *
 * Nothing here consults a model, a network, or a cache. If a value cannot be
 * proved correct locally it is rejected, and the caller turns the rejection
 * into a question for the user.
 */

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

/** Well-known burn / dead addresses, rejected as transfer recipients. */
const BURN_ADDRESSES = new Set([
  ZERO_ADDRESS.toLowerCase(),
  '0x000000000000000000000000000000000000dead',
  '0x0000000000000000000000000000000000000001',
])

export type AddressCheck =
  | { ok: true; address: `0x${string}`; checksummed: `0x${string}` }
  | { ok: false; reason: string; code: AddressRejection }

export type AddressRejection =
  | 'empty'
  | 'malformed'
  | 'burn-address'
  | 'unresolved-name'
  | 'self-transfer'

/**
 * Validates an EVM address. Names (`vitalik.eth`) are explicitly *not* resolved
 * here: name resolution is a network read with its own failure modes, so it is
 * reported as unresolved and handled by the caller rather than silently skipped.
 */
export function validateEvmAddress(
  input: string | null | undefined,
  options: { self?: string | null } = {},
): AddressCheck {
  const value = input?.trim() ?? ''
  if (!value) return { ok: false, reason: 'No recipient address was provided.', code: 'empty' }

  if (/\.(eth|base|cb\.id)$/i.test(value)) {
    return {
      ok: false,
      reason: `“${value}” is a name, not an address. ZeFi resolves names through a name service before signing; that resolution has not run yet.`,
      code: 'unresolved-name',
    }
  }

  if (!isAddress(value, { strict: false })) {
    return {
      ok: false,
      reason: 'That is not a valid EVM address. Addresses are 42 characters and begin with 0x.',
      code: 'malformed',
    }
  }

  const checksummed = getAddress(value)

  if (BURN_ADDRESSES.has(checksummed.toLowerCase())) {
    return {
      ok: false,
      reason: 'That address is a burn address. Funds sent to it cannot be recovered.',
      code: 'burn-address',
    }
  }

  if (options.self && checksummed.toLowerCase() === options.self.trim().toLowerCase()) {
    return {
      ok: false,
      reason: 'The recipient is the connected wallet. This transfer would send funds to yourself.',
      code: 'self-transfer',
    }
  }

  return { ok: true, address: value as `0x${string}`, checksummed }
}

/** True only for a syntactically plausible base58 Solana address. */
export function isPlausibleSolanaAddress(value: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value.trim())
}

/** A positive decimal string, validated without ever touching a float. */
export function validateDecimalAmount(
  value: string | null | undefined,
  decimals: number,
): { ok: true; normalised: string } | { ok: false; reason: string } {
  const raw = value?.trim() ?? ''
  if (!raw) return { ok: false, reason: 'No amount was provided.' }
  if (!/^\d+(\.\d+)?$/.test(raw)) {
    return { ok: false, reason: 'Amount must be a positive decimal number.' }
  }
  if (/^0+(\.0+)?$/.test(raw)) {
    return { ok: false, reason: 'Amount must be greater than zero.' }
  }
  const [, fraction = ''] = raw.split('.')
  if (fraction.length > decimals) {
    return {
      ok: false,
      reason: `This asset supports ${decimals} decimal places; the amount specifies ${fraction.length}.`,
    }
  }
  // Strip insignificant zeros without going through Number().
  const normalised = raw.includes('.') ? raw.replace(/0+$/, '').replace(/\.$/, '') : raw
  return { ok: true, normalised }
}

/** Exact decimal → base-units conversion using BigInt only. */
export function toBaseUnits(value: string, decimals: number): bigint {
  const [whole = '0', fraction = ''] = value.split('.')
  const padded = (fraction + '0'.repeat(decimals)).slice(0, decimals)
  return BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt(padded || '0')
}

/** Base-units → decimal string. Never rounds. */
export function fromBaseUnits(value: bigint, decimals: number): string {
  const negative = value < 0n
  const abs = negative ? -value : value
  const divisor = 10n ** BigInt(decimals)
  const whole = abs / divisor
  const fraction = abs % divisor
  const fractionText = fraction.toString().padStart(decimals, '0').replace(/0+$/, '')
  return `${negative ? '-' : ''}${whole}${fractionText ? `.${fractionText}` : ''}`
}

export function isValidTransactionHash(value: string): value is `0x${string}` {
  return /^0x[a-fA-F0-9]{64}$/.test(value.trim())
}

/* ── Request payload schemas ──────────────────────────────────────────────── */

/** The upper bound on any single user message reaching the AI layer. */
export const MAX_MESSAGE_LENGTH = 4000

export const ChatRequestSchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty').max(MAX_MESSAGE_LENGTH),
  conversationId: z.string().min(1).max(64).nullish(),
  wallet: z
    .object({
      address: z.string().refine((v) => isAddress(v, { strict: false }), 'Invalid wallet address'),
      chainId: z.number().int().positive(),
    })
    .nullish(),
})
export type ChatRequest = z.infer<typeof ChatRequestSchema>

export const ConversationTitleSchema = z.object({
  title: z.string().trim().min(1).max(120),
})

export const RecordTransactionSchema = z.object({
  planId: z.string().min(1).max(64),
  chainId: z.number().int().positive(),
  transactionHash: z.string().refine(isValidTransactionHash, 'Invalid transaction hash'),
  /**
   * Client-supplied idempotency key. Combined with the hash this makes a retry
   * from a flaky network indistinguishable from the original submission.
   */
  idempotencyKey: z.string().min(8).max(128),
})

export const WalletConnectionSchema = z.object({
  address: z.string().refine((v) => isAddress(v, { strict: false }), 'Invalid wallet address'),
  chainId: z.number().int().positive(),
  label: z.string().trim().max(64).nullish(),
})

/**
 * Strips anything that could be mistaken for an instruction when user text is
 * embedded in a prompt. This does not make the model immune to injection — the
 * real defence is that model output can never become transaction data — but it
 * removes the cheapest attacks.
 */
export function sanitiseForPrompt(input: string): string {
  return (
    input
      // Control characters, zero-width marks and bidi overrides: the usual
      // vehicles for hiding instructions inside apparently innocent text.
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u2028\u2029\u202A-\u202E\uFEFF]/g, '')
      // Neutralise the delimiters ZeFi uses to frame untrusted content.
      .replace(/<\/?(untrusted_user_message|system|assistant|human)>/gi, '')
      .slice(0, MAX_MESSAGE_LENGTH)
      .trim()
  )
}
