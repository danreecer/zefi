import type { Metadata } from 'next'

import { ChatWorkspace } from '@/components/app/chat/chat-workspace'
import { requireUser } from '@/lib/auth/session'
import { persistenceAvailable } from '@/lib/db/client'
import { listConversations } from '@/lib/db/repositories'

export const metadata: Metadata = { title: 'Assistant' }
export const dynamic = 'force-dynamic'

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ prompt?: string }>
}) {
  const user = await requireUser()
  const { prompt } = await searchParams
  const conversations = user.userId ? await listConversations(user.userId) : []

  return (
    <ChatWorkspace
      key="new"
      conversations={conversations.map((conversation) => ({
        id: conversation.id,
        title: conversation.title,
        updatedAt: conversation.updatedAt.toISOString(),
      }))}
      activeConversationId={null}
      initialMessages={[]}
      persisted={persistenceAvailable()}
      initialPrompt={prompt?.slice(0, 4000)}
    />
  )
}
