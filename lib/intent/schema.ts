import { z } from 'zod'

/**
 * The structured intent contract.
 *
 * This schema is the boundary between language and execution. Everything the
 * model produces is parsed through it before any other part of the system is
 * allowed to look at it, and anything that fails validation is treated as a
 * missing-information case rather than being coerced into something usable.
 */

export const INTENT_TYPES = [
  'EXPLAIN',
  'PORTFOLIO_QUERY',
  'SEND',
  'SWAP',
  'BRIDGE',
  'APPROVE',
  'CONTRACT_INTERACTION',
  'COMPARE_ROUTES',
  'ROUTEFOLD_ANALYSIS',
  'UNKNOWN',
] as const

export type IntentType = (typeof INTENT_TYPES)[number]
export const IntentTypeSchema = z.enum(INTENT_TYPES)

/** Intents that describe an onchain state change and therefore need a plan. */
export const TRANSACTIONAL_INTENTS = [
  'SEND',
  'SWAP',
  'BRIDGE',
  'APPROVE',
  'CONTRACT_INTERACTION',
] as const satisfies readonly IntentType[]

export function isTransactionalIntent(type: IntentType): boolean {
  return (TRANSACTIONAL_INTENTS as readonly IntentType[]).includes(type)
}

export const AmountUnitSchema = z.enum(['token', 'usd', 'percent', 'max'])
export type AmountUnit = z.infer<typeof AmountUnitSchema>

export const AmountSchema = z.object({
  /**
   * Kept as a string all the way to the point of encoding. Amounts never pass
   * through a JS float, so 0.1 + 0.2 problems cannot reach a transaction.
   */
  value: z.string().regex(/^\d+(\.\d+)?$/, 'Amount must be a positive decimal string'),
  unit: AmountUnitSchema,
})
export type Amount = z.infer<typeof AmountSchema>

export const UserPrioritySchema = z.enum(['safest', 'cheapest', 'fastest', 'balanced'])
export type UserPriority = z.infer<typeof UserPrioritySchema>

export const RequiredApprovalSchema = z.object({
  chain: z.string(),
  asset: z.string(),
  spenderLabel: z.string(),
  reason: z.string(),
})
export type RequiredApproval = z.infer<typeof RequiredApprovalSchema>

/**
 * Field names the resolver may report as missing. A closed set keeps the UI
 * able to ask a precise follow-up question instead of echoing model prose.
 */
export const MISSING_FIELDS = [
  'sourceNetwork',
  'destinationNetwork',
  'sourceAsset',
  'destinationAsset',
  'amount',
  'recipient',
  'connectedWallet',
  'slippageTolerance',
] as const
export type MissingField = (typeof MISSING_FIELDS)[number]
export const MissingFieldSchema = z.enum(MISSING_FIELDS)

export const StructuredIntentSchema = z.object({
  intentType: IntentTypeSchema,

  /** Free-text chain references. Resolved against the registry, never trusted. */
  sourceNetwork: z.string().nullable().default(null),
  destinationNetwork: z.string().nullable().default(null),

  sourceAsset: z.string().nullable().default(null),
  destinationAsset: z.string().nullable().default(null),

  amount: AmountSchema.nullable().default(null),

  /** An address or ENS-style name exactly as the user wrote it. */
  recipient: z.string().nullable().default(null),

  slippageTolerancePercent: z.number().min(0).max(50).nullable().default(null),
  priority: UserPrioritySchema.nullable().default(null),

  requiredApprovals: z.array(RequiredApprovalSchema).default([]),
  missingInformation: z.array(MissingFieldSchema).default([]),

  confidence: z.number().min(0).max(1),

  /** Anything the interpretation had to assume. Always surfaced to the user. */
  assumptions: z.array(z.string()).default([]),

  /** One focused question when a critical field is missing. */
  clarifyingQuestion: z.string().nullable().default(null),

  /** One-line restatement of what the user asked for, in ZeFi's own words. */
  summary: z.string().min(1).max(320),
})

export type StructuredIntent = z.infer<typeof StructuredIntentSchema>

/**
 * The shape the model is asked to emit. Deliberately looser than
 * `StructuredIntentSchema` on the enum fields: the model returns strings, and
 * the resolver maps them onto the registry. A hallucinated chain name becomes a
 * clarifying question instead of a schema crash.
 */
export const ModelIntentSchema = z.object({
  intentType: z.string(),
  sourceNetwork: z.string().nullish(),
  destinationNetwork: z.string().nullish(),
  sourceAsset: z.string().nullish(),
  destinationAsset: z.string().nullish(),
  amountValue: z.string().nullish(),
  amountUnit: z.string().nullish(),
  recipient: z.string().nullish(),
  slippageTolerancePercent: z.number().nullish(),
  priority: z.string().nullish(),
  confidence: z.number().min(0).max(1),
  assumptions: z.array(z.string()).nullish(),
  clarifyingQuestion: z.string().nullish(),
  summary: z.string(),
})
export type ModelIntent = z.infer<typeof ModelIntentSchema>

/** A resolved intent: every reference checked against the chain registry. */
export interface ResolvedIntent {
  intent: StructuredIntent
  /** Registry keys, or null when the reference did not resolve. */
  sourceChainKey: string | null
  destinationChainKey: string | null
  sourceTokenSymbol: string | null
  destinationTokenSymbol: string | null
  recipientAddress: string | null
  missing: MissingField[]
  /** Blocking problems that are not simply "a field is absent". */
  blockers: string[]
  ready: boolean
}
