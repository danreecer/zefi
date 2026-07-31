import type { NextRequest } from 'next/server'

import { fail, handleRouteError, ok } from '@/lib/api/respond'
import { requireUser } from '@/lib/auth/session'
import { getChainById } from '@/lib/chains/registry'
import { serverEnv } from '@/lib/config/env'
import { deserialisePlan, getPlan, listTransactions, recordActivity, recordTransaction, updatePlanStatus } from '@/lib/db/repositories'
import { canTransition } from '@/lib/planner/types'
import { checkMutationLimit } from '@/lib/security/rate-limit'
import { RecordTransactionSchema } from '@/lib/security/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await requireUser()
    const transactions = user.userId ? await listTransactions(user.userId) : []
    return ok({ transactions })
  } catch (error) {
    return handleRouteError(error)
  }
}

/**
 * Records a transaction the user's wallet has already submitted.
 *
 * ZeFi never submits anything itself — by the time this runs, the wallet has
 * broadcast and returned a hash. This endpoint exists so the plan and the hash
 * stay connected, and so a retried request cannot create a second record.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    if (!checkMutationLimit(user.clerkUserId).allowed) {
      return fail('rate_limited', 'Too many submissions in a short window.', 429)
    }

    if (!serverEnv.flags.executionEnabled) {
      return fail(
        'execution_disabled',
        'TRANSACTION_EXECUTION_ENABLED is false on this deployment, so ZeFi does not record submissions.',
        409,
      )
    }

    const body = await request.json().catch(() => null)
    const input = RecordTransactionSchema.parse(body)

    if (!user.userId) {
      return fail(
        'persistence_unavailable',
        'No database is configured, so this transaction cannot be recorded. It is still onchain — ZeFi simply has no record of it.',
        503,
      )
    }

    const chain = getChainById(input.chainId)
    if (!chain) return fail('invalid_request', `Chain id ${input.chainId} is not supported.`, 400)

    const planRow = await getPlan(user.userId, input.planId)
    if (!planRow) return fail('not_found', 'Transaction plan was not found.', 404)

    const plan = deserialisePlan(planRow.planData)
    if (plan && !canTransition(planRow.status, 'submitted')) {
      return fail(
        'invalid_transition',
        `A plan in “${planRow.status}” cannot move to “submitted”.`,
        409,
      )
    }

    const { record, created } = await recordTransaction(user.userId, input)

    if (created) {
      await updatePlanStatus(user.userId, input.planId, 'submitted')
      await recordActivity(user.userId, 'transaction.submitted', {
        planId: input.planId,
        chainId: input.chainId,
        transactionHash: input.transactionHash,
      })
    }

    return ok(
      {
        record,
        // `false` means an identical submission was already recorded — the
        // client's retry was absorbed rather than duplicated.
        created,
        explorerUrl: `${chain.explorerUrl}${chain.explorerTxPath}${input.transactionHash}`,
      },
      { status: created ? 201 : 200 },
    )
  } catch (error) {
    return handleRouteError(error)
  }
}
