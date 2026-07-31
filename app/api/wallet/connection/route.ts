import type { NextRequest } from 'next/server'

import { handleRouteError, ok } from '@/lib/api/respond'
import { requireUser } from '@/lib/auth/session'
import { recordWalletConnection } from '@/lib/db/repositories'
import { WalletConnectionSchema } from '@/lib/security/validation'
import { getAddress } from 'viem'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Records that a wallet was seen.
 *
 * Stores the public address, the chain id, and a timestamp. Nothing else — and
 * storing a public address confers no ability to move anything.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const body = await request.json().catch(() => null)
    const input = WalletConnectionSchema.parse(body)

    if (!user.userId) {
      return ok({ recorded: false, reason: 'No database is configured; wallet history is not stored.' })
    }

    const connection = await recordWalletConnection(user.userId, {
      address: getAddress(input.address),
      chainId: input.chainId,
      label: input.label ?? null,
    })

    return ok({ recorded: true, connection })
  } catch (error) {
    return handleRouteError(error)
  }
}
