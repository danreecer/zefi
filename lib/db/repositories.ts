import 'server-only'

import type { Prisma, PrismaClient } from '@prisma/client'

import type { StructuredIntent } from '@/lib/intent/schema'
import type { TransactionPlan } from '@/lib/planner/types'
import { getDb, requireDb } from './client'

/**
 * Data access.
 *
 * Every function that reads or writes user-owned data takes `userId` as its
 * first argument and includes it in the `where` clause. There is no
 * `findUnique({ where: { id } })` on a user-owned row anywhere in this file —
 * that pattern is how horizontal privilege escalation gets shipped, and it is
 * structurally excluded rather than reviewed for.
 */

export class NotFoundOrForbiddenError extends Error {
  constructor(resource: string) {
    // Deliberately does not distinguish "does not exist" from "belongs to
    // someone else". The difference is itself information.
    super(`${resource} was not found.`)
    this.name = 'NotFoundOrForbiddenError'
  }
}

/* ── Profile ───────────────────────────────────────────────────────────────── */

export async function ensureUserProfile(
  clerkUserId: string,
  data: { displayName?: string | null; email?: string | null } = {},
) {
  const db = getDb()
  if (!db) return null

  return db.userProfile.upsert({
    where: { clerkUserId },
    create: {
      clerkUserId,
      displayName: data.displayName ?? null,
      email: data.email ?? null,
    },
    update: {
      ...(data.displayName !== undefined ? { displayName: data.displayName } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
    },
  })
}

export async function getUserProfile(clerkUserId: string) {
  const db = getDb()
  if (!db) return null
  return db.userProfile.findUnique({ where: { clerkUserId } })
}

/* ── Conversations ─────────────────────────────────────────────────────────── */

export async function listConversations(userId: string, limit = 30) {
  const db = getDb()
  if (!db) return []
  return db.conversation.findMany({
    where: { userId, archived: false },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  })
}

export async function createConversation(userId: string, title = 'New conversation') {
  const db = requireDb()
  return db.conversation.create({ data: { userId, title } })
}

export async function getConversation(userId: string, conversationId: string) {
  const db = getDb()
  if (!db) return null
  return db.conversation.findFirst({
    where: { id: conversationId, userId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })
}

export async function renameConversation(userId: string, conversationId: string, title: string) {
  const db = requireDb()
  const result = await db.conversation.updateMany({
    where: { id: conversationId, userId },
    data: { title },
  })
  if (result.count === 0) throw new NotFoundOrForbiddenError('Conversation')
  return result
}

export async function deleteConversation(userId: string, conversationId: string) {
  const db = requireDb()
  // deleteMany scoped by userId — a delete by id alone would let one user
  // remove another's conversation by guessing a cuid.
  const result = await db.conversation.deleteMany({ where: { id: conversationId, userId } })
  if (result.count === 0) throw new NotFoundOrForbiddenError('Conversation')
  return result
}

/* ── Messages ──────────────────────────────────────────────────────────────── */

export async function appendMessage(
  userId: string,
  conversationId: string,
  message: {
    role: 'user' | 'assistant' | 'system'
    content: string
    structuredContent?: Prisma.InputJsonValue
  },
) {
  const db = requireDb()

  // Ownership is proved before the write, inside the same transaction.
  return db.$transaction(async (tx) => {
    const conversation = await tx.conversation.findFirst({
      where: { id: conversationId, userId },
      select: { id: true },
    })
    if (!conversation) throw new NotFoundOrForbiddenError('Conversation')

    const created = await tx.message.create({
      data: {
        conversationId,
        role: message.role,
        content: message.content,
        ...(message.structuredContent !== undefined
          ? { structuredContent: message.structuredContent }
          : {}),
      },
    })

    await tx.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } })
    return created
  })
}

/* ── Intents & plans ───────────────────────────────────────────────────────── */

export async function saveIntentAndPlan(
  userId: string,
  input: {
    conversationId: string | null
    intent: StructuredIntent
    plan: TransactionPlan | null
  },
) {
  const db = getDb()
  if (!db) return null

  return db.$transaction(async (tx) => {
    if (input.conversationId) {
      const owned = await tx.conversation.findFirst({
        where: { id: input.conversationId, userId },
        select: { id: true },
      })
      if (!owned) throw new NotFoundOrForbiddenError('Conversation')
    }

    const intent = await tx.transactionIntent.create({
      data: {
        userId,
        conversationId: input.conversationId,
        intentType: input.intent.intentType,
        structuredIntent: input.intent as unknown as Prisma.InputJsonValue,
        confidence: input.intent.confidence,
        status: input.plan
          ? input.plan.missingInformation.length > 0
            ? 'needs_information'
            : 'planned'
          : 'parsed',
      },
    })

    if (!input.plan) return { intent, plan: null }

    const plan = await tx.transactionPlan.create({
      data: {
        intentId: intent.id,
        planData: serialisePlan(input.plan),
        validationData: {
          missingInformation: input.plan.missingInformation,
          blockers: input.plan.blockers,
          dataSources: input.plan.dataSources,
        } as unknown as Prisma.InputJsonValue,
        simulationData: input.plan.simulation as unknown as Prisma.InputJsonValue,
        riskData: input.plan.risks as unknown as Prisma.InputJsonValue,
        status: input.plan.status,
      },
    })

    return { intent, plan }
  })
}

export async function listPlans(userId: string, limit = 25) {
  const db = getDb()
  if (!db) return []
  return db.transactionPlan.findMany({
    where: { intent: { userId } },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    include: {
      intent: { select: { intentType: true, confidence: true, conversationId: true } },
      records: { select: { transactionHash: true, chainId: true, status: true } },
    },
  })
}

export async function getPlan(userId: string, planId: string) {
  const db = getDb()
  if (!db) return null
  return db.transactionPlan.findFirst({
    where: { id: planId, intent: { userId } },
    include: { intent: true, records: true },
  })
}

export async function updatePlanStatus(
  userId: string,
  planId: string,
  status: TransactionPlan['status'],
  patch: {
    simulationData?: Prisma.InputJsonValue
    riskData?: Prisma.InputJsonValue
    planData?: Prisma.InputJsonValue
  } = {},
) {
  const db = requireDb()
  const result = await db.transactionPlan.updateMany({
    where: { id: planId, intent: { userId } },
    data: { status, ...patch },
  })
  if (result.count === 0) throw new NotFoundOrForbiddenError('Transaction plan')
  return result
}

/* ── Wallets ───────────────────────────────────────────────────────────────── */

export async function recordWalletConnection(
  userId: string,
  input: { address: string; chainId: number; label?: string | null },
) {
  const db = getDb()
  if (!db) return null
  return db.walletConnection.upsert({
    where: {
      userId_address_chainId: { userId, address: input.address, chainId: input.chainId },
    },
    create: { userId, address: input.address, chainId: input.chainId, label: input.label ?? null },
    update: { lastSeenAt: new Date(), ...(input.label ? { label: input.label } : {}) },
  })
}

export async function listWalletConnections(userId: string) {
  const db = getDb()
  if (!db) return []
  return db.walletConnection.findMany({
    where: { userId },
    orderBy: { lastSeenAt: 'desc' },
    take: 20,
  })
}

/* ── Transaction records ───────────────────────────────────────────────────── */

/**
 * Records a submitted transaction.
 *
 * Two independent uniqueness constraints make this idempotent: one on
 * (chainId, transactionHash) and one on (userId, idempotencyKey). A retry after
 * a dropped response returns the existing row instead of creating a duplicate.
 */
export async function recordTransaction(
  userId: string,
  input: { planId: string; chainId: number; transactionHash: string; idempotencyKey: string },
) {
  const db = requireDb()

  const owned = await db.transactionPlan.findFirst({
    where: { id: input.planId, intent: { userId } },
    select: { id: true },
  })
  if (!owned) throw new NotFoundOrForbiddenError('Transaction plan')

  const existing = await db.transactionRecord.findFirst({
    where: {
      userId,
      OR: [
        { idempotencyKey: input.idempotencyKey },
        { chainId: input.chainId, transactionHash: input.transactionHash },
      ],
    },
  })
  if (existing) return { record: existing, created: false }

  try {
    const record = await db.transactionRecord.create({
      data: {
        userId,
        planId: input.planId,
        chainId: input.chainId,
        transactionHash: input.transactionHash,
        idempotencyKey: input.idempotencyKey,
        status: 'submitted',
      },
    })
    return { record, created: true }
  } catch (error) {
    // Lost a race against a concurrent identical submission — return theirs.
    if (isUniqueViolation(error)) {
      const record = await db.transactionRecord.findFirst({
        where: { userId, idempotencyKey: input.idempotencyKey },
      })
      if (record) return { record, created: false }
    }
    throw error
  }
}

export async function listTransactions(userId: string, limit = 50) {
  const db = getDb()
  if (!db) return []
  return db.transactionRecord.findMany({
    where: { userId },
    orderBy: { submittedAt: 'desc' },
    take: limit,
    include: { plan: { select: { id: true, status: true, planData: true } } },
  })
}

export async function markTransactionConfirmed(
  userId: string,
  transactionHash: string,
  chainId: number,
  blockNumber: bigint | null,
) {
  const db = requireDb()
  const result = await db.transactionRecord.updateMany({
    where: { userId, transactionHash, chainId },
    data: { status: 'confirmed', confirmedAt: new Date(), blockNumber },
  })
  if (result.count === 0) throw new NotFoundOrForbiddenError('Transaction record')
  return result
}

/* ── Usage & activity ──────────────────────────────────────────────────────── */

export type UsageActionType =
  | 'assistant_turn'
  | 'intent_extraction'
  | 'plan_generation'
  | 'simulation'
  | 'wallet_read'
  | 'routefold_analysis'

export async function recordUsage(userId: string, actionType: UsageActionType, units = 1) {
  const db = getDb()
  if (!db) return null
  return db.usageRecord.create({ data: { userId, actionType, units } })
}

export async function usageSince(userId: string, since: Date) {
  const db = getDb()
  if (!db) return []
  return db.usageRecord.groupBy({
    by: ['actionType'],
    where: { userId, createdAt: { gte: since } },
    _sum: { units: true },
  })
}

/**
 * Usage over a trailing window. The clock lives here rather than in a component
 * so rendering stays a pure function of its inputs.
 */
export async function usageInLastDays(userId: string, days: number) {
  return usageSince(userId, new Date(Date.now() - days * 24 * 60 * 60 * 1000))
}

export async function recordActivity(
  userId: string,
  action: string,
  metadata?: Prisma.InputJsonValue,
) {
  const db = getDb()
  if (!db) return null
  return db.activityEvent.create({
    data: { userId, action, ...(metadata !== undefined ? { metadata } : {}) },
  })
}

export async function listActivity(userId: string, limit = 20) {
  const db = getDb()
  if (!db) return []
  return db.activityEvent.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

/** Distinct addresses this user has previously sent to. Feeds the risk engine. */
export async function knownRecipients(userId: string): Promise<string[]> {
  const db = getDb()
  if (!db) return []
  const plans = await db.transactionPlan.findMany({
    where: { intent: { userId }, records: { some: { status: { in: ['submitted', 'confirmed'] } } } },
    select: { planData: true },
    take: 200,
  })
  const addresses = new Set<string>()
  for (const row of plans) {
    const data = row.planData as { actions?: Array<{ recipient?: string | null }> } | null
    for (const action of data?.actions ?? []) {
      if (action.recipient) addresses.add(action.recipient)
    }
  }
  return [...addresses]
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */

function serialisePlan(plan: TransactionPlan): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(plan)) as Prisma.InputJsonValue
}

export function deserialisePlan(value: Prisma.JsonValue | null): TransactionPlan | null {
  if (!value || typeof value !== 'object') return null
  return value as unknown as TransactionPlan
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  )
}

export type Db = PrismaClient
