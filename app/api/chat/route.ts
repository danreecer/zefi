import type { NextRequest } from 'next/server'

import { runAssistantTurn } from '@/lib/ai/pipeline'
import { fail, handleRouteError, ok } from '@/lib/api/respond'
import { requireUser } from '@/lib/auth/session'
import { getChainById } from '@/lib/chains/registry'
import {
  appendMessage,
  createConversation,
  getConversation,
  knownRecipients,
  recordActivity,
  recordUsage,
  saveIntentAndPlan,
} from '@/lib/db/repositories'
import { checkAssistantLimits, rateLimitHeaders } from '@/lib/security/rate-limit'
import { ChatRequestSchema } from '@/lib/security/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * The assistant endpoint.
 *
 * Order matters here: authenticate, rate limit, validate, *then* run the
 * pipeline. Persistence is best-effort and never blocks a reply — a deployment
 * without a database still works, and says so.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()

    const limit = checkAssistantLimits(user.clerkUserId)
    if (!limit.allowed) {
      return fail(
        'rate_limited',
        `You have reached the request limit for this window. Try again in ${limit.retryAfterSeconds} seconds.`,
        429,
      )
    }

    const body = await request.json().catch(() => null)
    const parsed = ChatRequestSchema.parse(body)

    // Resolve or create the conversation before running, so a failed turn still
    // leaves the user's own message recorded.
    let conversationId = parsed.conversationId ?? null
    let history: Array<{ role: 'user' | 'assistant'; content: string }> = []

    if (user.userId) {
      if (conversationId) {
        const existing = await getConversation(user.userId, conversationId)
        if (!existing) return fail('not_found', 'Conversation was not found.', 404)
        history = existing.messages
          .filter((message) => message.role !== 'system')
          .map((message) => ({
            role: message.role === 'assistant' ? ('assistant' as const) : ('user' as const),
            content: message.content,
          }))
      } else {
        const created = await createConversation(user.userId, titleFrom(parsed.message))
        conversationId = created.id
      }

      await appendMessage(user.userId, conversationId, { role: 'user', content: parsed.message })
    }

    const recipients = user.userId ? await knownRecipients(user.userId) : []

    const turn = await runAssistantTurn({
      message: parsed.message,
      wallet: {
        address: parsed.wallet?.address ?? null,
        chainId: parsed.wallet?.chainId ?? null,
      },
      history,
      knownRecipients: recipients,
    })

    if (user.userId && conversationId) {
      const saved = await saveIntentAndPlan(user.userId, {
        conversationId,
        intent: turn.intent,
        plan: turn.plan,
      })

      await appendMessage(user.userId, conversationId, {
        role: 'assistant',
        content: turn.message,
        // Serialised through JSON so the stored shape is exactly what the app
        // reads back, and so Prisma sees a plain JSON value.
        structuredContent: JSON.parse(
          JSON.stringify({
            intent: turn.intent,
            plan: turn.plan,
            planRecordId: saved?.plan?.id ?? null,
            notices: turn.notices,
            stages: turn.stages,
            mode: turn.mode,
          }),
        ) as object,
      })

      await recordUsage(user.userId, 'assistant_turn')
      if (turn.plan) await recordUsage(user.userId, 'plan_generation')
      await recordActivity(user.userId, 'assistant.turn', {
        intentType: turn.intent.intentType,
        hasPlan: Boolean(turn.plan),
        chain: getChainById(parsed.wallet?.chainId ?? null)?.key ?? null,
      })
    }

    return ok(
      {
        conversationId,
        persisted: Boolean(user.userId),
        message: turn.message,
        intent: turn.intent,
        plan: turn.plan,
        followUpQuestion: turn.followUpQuestion,
        notices: turn.notices,
        mode: turn.mode,
        stages: turn.stages,
        capabilities: turn.capabilities,
      },
      { headers: rateLimitHeaders(limit) },
    )
  } catch (error) {
    return handleRouteError(error)
  }
}

/** First clause of the user's message, trimmed to something list-friendly. */
function titleFrom(message: string): string {
  const clean = message.replace(/\s+/g, ' ').trim()
  if (clean.length <= 48) return clean
  const cut = clean.slice(0, 48)
  const lastSpace = cut.lastIndexOf(' ')
  return `${cut.slice(0, lastSpace > 20 ? lastSpace : 48)}…`
}
