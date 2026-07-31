import { handleRouteError, ok } from '@/lib/api/respond'
import { requireUser } from '@/lib/auth/session'
import { persistenceAvailable } from '@/lib/db/client'
import { createConversation, listConversations } from '@/lib/db/repositories'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await requireUser()
    const conversations = user.userId ? await listConversations(user.userId) : []
    return ok({ conversations, persisted: persistenceAvailable() })
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function POST() {
  try {
    const user = await requireUser()
    if (!user.userId) {
      return ok({ conversation: null, persisted: false })
    }
    const conversation = await createConversation(user.userId)
    return ok({ conversation, persisted: true }, { status: 201 })
  } catch (error) {
    return handleRouteError(error)
  }
}
