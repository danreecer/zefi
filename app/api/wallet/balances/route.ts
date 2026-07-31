import type { NextRequest } from 'next/server'
import { isAddress } from 'viem'

import { fail, handleRouteError, ok } from '@/lib/api/respond'
import { requireUser } from '@/lib/auth/session'
import { EXECUTABLE_CHAIN_KEYS } from '@/lib/chains/registry'
import { recordUsage } from '@/lib/db/repositories'
import { checkMutationLimit } from '@/lib/security/rate-limit'
import { readWalletAcrossChains } from '@/lib/wallet/server-reads'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Read-only balance reads across supported EVM networks.
 *
 * Partial failure is surfaced in `errors`, never converted into a zero. A
 * caller can tell the difference between "you hold nothing here" and "we could
 * not find out".
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser()
    if (!checkMutationLimit(user.clerkUserId).allowed) {
      return fail('rate_limited', 'Too many balance reads in a short window.', 429)
    }

    const address = request.nextUrl.searchParams.get('address')?.trim() ?? ''
    if (!isAddress(address, { strict: false })) {
      return fail('invalid_request', 'A valid EVM address is required.', 400)
    }

    const requested = request.nextUrl.searchParams.get('chains')?.split(',').filter(Boolean)
    const chains = requested?.length
      ? requested.filter((key) => EXECUTABLE_CHAIN_KEYS.includes(key))
      : EXECUTABLE_CHAIN_KEYS

    if (chains.length === 0) {
      return fail('invalid_request', 'No supported networks were requested.', 400)
    }

    const result = await readWalletAcrossChains(address, chains)
    if (user.userId) await recordUsage(user.userId, 'wallet_read', chains.length)

    return ok({
      address,
      readAt: result.readAt,
      snapshots: result.snapshots,
      errors: result.errors,
      complete: result.errors.length === 0,
    })
  } catch (error) {
    return handleRouteError(error)
  }
}
