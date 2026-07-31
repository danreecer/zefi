import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ChatWorkspace, type ChatMessage } from '@/components/app/chat/chat-workspace'
import { requireUser } from '@/lib/auth/session'
import { persistenceAvailable } from '@/lib/db/client'
import { getConversation, listConversations } from '@/lib/db/repositories'
import type { StructuredIntent } from '@/lib/intent/schema'
import type { TransactionPlan } from '@/lib/planner/types'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const user = await requireUser()
  const { id } = await params
  const conversation = user.userId ? await getConversation(user.userId, id) : null
  return { title: conversation?.title ?? 'Assistant' }
}

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await params

  // Scoped by userId — another user's conversation is indistinguishable from
  // one that does not exist.
  const conversation = user.userId ? await getConversation(user.userId, id) : null
  if (!conversation) notFound()

  const conversations = user.userId ? await listConversations(user.userId) : []

  const messages: ChatMessage[] = conversation.messages
    .filter((message) => message.role !== 'system')
    .map((message) => {
      const structured = message.structuredContent as {
        plan?: TransactionPlan | null
        intent?: StructuredIntent | null
      } | null

      return {
        id: message.id,
        role: message.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: message.content,
        plan: structured?.plan ?? null,
        intent: structured?.intent ?? null,
        createdAt: message.createdAt.toISOString(),
      }
    })

  return (
    <ChatWorkspace
      key={conversation.id}
      conversations={conversations.map((item) => ({
        id: item.id,
        title: item.title,
        updatedAt: item.updatedAt.toISOString(),
      }))}
      activeConversationId={conversation.id}
      initialMessages={messages}
      persisted={persistenceAvailable()}
    />
  )
}
