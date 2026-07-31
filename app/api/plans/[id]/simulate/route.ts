import type { NextRequest } from 'next/server'

import { fail, handleRouteError, ok } from '@/lib/api/respond'
import { requireUser } from '@/lib/auth/session'
import { getChainById } from '@/lib/chains/registry'
import { deserialisePlan, getPlan, recordUsage, updatePlanStatus } from '@/lib/db/repositories'
import { canTransition } from '@/lib/planner/types'
import { checkMutationLimit } from '@/lib/security/rate-limit'
import { runSimulation } from '@/lib/simulation'
import { readChainBalances, toBalanceReadings } from '@/lib/wallet/server-reads'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

/**
 * Re-runs validation for a stored plan.
 *
 * Balances go stale, and a plan built ten minutes ago may no longer be
 * fundable. This endpoint re-reads the chain and re-runs the checks, then moves
 * the plan's status through the state machine rather than assigning it.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await requireUser()
    const { id } = await params

    if (!checkMutationLimit(user.clerkUserId).allowed) {
      return fail('rate_limited', 'Too many simulation requests in a short window.', 429)
    }
    if (!user.userId) return fail('persistence_unavailable', 'No database is configured.', 503)

    const row = await getPlan(user.userId, id)
    if (!row) return fail('not_found', 'Transaction plan was not found.', 404)

    const plan = deserialisePlan(row.planData)
    if (!plan) return fail('invalid_state', 'This plan could not be read back.', 422)

    const body = (await request.json().catch(() => ({}))) as {
      address?: string
      chainId?: number
    }

    const chainKey = plan.actions[0]?.chainKey ?? plan.intent.sourceNetwork
    const snapshot =
      body.address && chainKey ? await readChainBalances(body.address, chainKey) : null

    const simulation = await runSimulation({
      plan,
      wallet: { address: body.address ?? null, chainId: body.chainId ?? null },
      ...(snapshot ? { balances: toBalanceReadings([snapshot]) } : {}),
    })

    const nextStatus =
      simulation.status === 'failed'
        ? ('missing_information' as const)
        : simulation.status === 'warning'
          ? ('simulation_warning' as const)
          : ('simulation_passed' as const)

    const target = canTransition(row.status, nextStatus) ? nextStatus : row.status

    await updatePlanStatus(user.userId, id, target, {
      simulationData: JSON.parse(JSON.stringify(simulation)),
    })
    await recordUsage(user.userId, 'simulation')

    return ok({
      planId: id,
      status: target,
      simulation,
      chain: getChainById(body.chainId ?? null)?.key ?? chainKey,
      // Present so a client never has to infer coverage from the status alone.
      deepSimulation: simulation.deepSimulation,
    })
  } catch (error) {
    return handleRouteError(error)
  }
}
