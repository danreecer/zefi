import type { NextRequest } from 'next/server'

import { fail, handleRouteError, ok } from '@/lib/api/respond'
import { requireUser } from '@/lib/auth/session'
import {
  deleteConversation,
  getConversation,
  recordActivity,
  renameConversation,
} from '@/lib/db/repositories'
import { checkMutationLimit } from '@/lib/security/rate-limit'
import { ConversationTitleSchema } from '@/lib/security/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const user = await requireUser()
    const { id } = await params
    if (!user.userId) return fail('persistence_unavailable', 'No database is configured.', 503)

    const conversation = await getConversation(user.userId, id)
    if (!conversation) return fail('not_found', 'Conversation was not found.', 404)
    return ok({ conversation })
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await requireUser()
    const { id } = await params
    if (!checkMutationLimit(user.clerkUserId).allowed) {
      return fail('rate_limited', 'Too many changes in a short window.', 429)
    }
    if (!user.userId) return fail('persistence_unavailable', 'No database is configured.', 503)

    const body = await request.json().catch(() => null)
    const { title } = ConversationTitleSchema.parse(body)

    // Scoped by userId inside the repository — ownership is proved, not assumed.
    await renameConversation(user.userId, id, title)
    await recordActivity(user.userId, 'conversation.renamed', { conversationId: id })
    return ok({ id, title })
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const user = await requireUser()
    const { id } = await params
    if (!checkMutationLimit(user.clerkUserId).allowed) {
      return fail('rate_limited', 'Too many changes in a short window.', 429)
    }
    if (!user.userId) return fail('persistence_unavailable', 'No database is configured.', 503)

    await deleteConversation(user.userId, id)
    await recordActivity(user.userId, 'conversation.deleted', { conversationId: id })
    return ok({ id, deleted: true })
  } catch (error) {
    return handleRouteError(error)
  }
}
