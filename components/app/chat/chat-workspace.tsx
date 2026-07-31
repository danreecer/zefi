'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, ArrowUp, Loader2, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useAccount, useChainId } from 'wagmi'

import { ZefiMark } from '@/components/brand/zefi-mark'
import { PlanCard } from '@/components/plan/plan-card'
import { RichText } from '@/components/ui/rich-text'
import type { Notice } from '@/lib/ai/pipeline'
import type { StructuredIntent } from '@/lib/intent/schema'
import type { TransactionPlan } from '@/lib/planner/types'
import { QUICK_PROMPTS } from '@/lib/demo/fixtures'
import { cn, createId, formatRelativeTime } from '@/lib/utils'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  plan?: TransactionPlan | null
  intent?: StructuredIntent | null
  notices?: Notice[]
  createdAt: string
  pending?: boolean
  failed?: boolean
}

export interface ConversationSummary {
  id: string
  title: string
  updatedAt: string | Date
}

/**
 * The assistant workspace.
 *
 * Optimistic on the user's own message, honest about everything else: a failed
 * turn shows as a failed turn, and the assistant bubble is never populated with
 * placeholder text while a request is in flight.
 */
export function ChatWorkspace({
  conversations,
  activeConversationId,
  initialMessages,
  persisted,
  initialPrompt,
}: {
  conversations: ConversationSummary[]
  activeConversationId: string | null
  initialMessages: ChatMessage[]
  persisted: boolean
  /** Pre-fills the composer from a quick prompt. Never auto-sends. */
  initialPrompt?: string
}) {
  const router = useRouter()
  const { address } = useAccount()
  const chainId = useChainId()

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState(initialPrompt ?? '')
  const [busy, setBusy] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(activeConversationId)

  const endRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // No prop→state sync: the route keys this component by conversation, so a
  // different conversation is a fresh mount rather than a re-synced one.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || busy) return

      const userMessage: ChatMessage = {
        id: createId('msg'),
        role: 'user',
        content: trimmed,
        createdAt: new Date().toISOString(),
      }
      setMessages((current) => [...current, userMessage])
      setInput('')
      setBusy(true)

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            message: trimmed,
            conversationId,
            wallet: address ? { address, chainId } : null,
          }),
        })

        const payload = (await response.json()) as
          | {
              ok: true
              data: {
                conversationId: string | null
                message: string
                plan: TransactionPlan | null
                intent: StructuredIntent
                notices: Notice[]
              }
            }
          | { ok: false; error: { code: string; message: string } }

        if (!payload.ok) {
          setMessages((current) => [
            ...current,
            {
              id: createId('msg'),
              role: 'assistant',
              content: payload.error.message,
              createdAt: new Date().toISOString(),
              failed: true,
            },
          ])
          return
        }

        setMessages((current) => [
          ...current,
          {
            id: createId('msg'),
            role: 'assistant',
            content: payload.data.message,
            plan: payload.data.plan,
            intent: payload.data.intent,
            notices: payload.data.notices,
            createdAt: new Date().toISOString(),
          },
        ])

        if (payload.data.conversationId && payload.data.conversationId !== conversationId) {
          setConversationId(payload.data.conversationId)
          // Sync the URL without re-mounting the workspace mid-conversation.
          window.history.replaceState(null, '', `/app/chat/${payload.data.conversationId}`)
          router.refresh()
        }
      } catch {
        setMessages((current) => [
          ...current,
          {
            id: createId('msg'),
            role: 'assistant',
            content:
              'ZeFi could not reach its own API. Nothing was sent to a model and nothing was submitted onchain.',
            createdAt: new Date().toISOString(),
            failed: true,
          },
        ])
      } finally {
        setBusy(false)
        textareaRef.current?.focus()
      }
    },
    [address, busy, chainId, conversationId, router],
  )

  const remove = useCallback(
    async (id: string) => {
      const response = await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        toast.error('Could not delete that conversation.')
        return
      }
      toast.success('Conversation deleted')
      if (id === conversationId) router.push('/app/chat')
      else router.refresh()
    },
    [conversationId, router],
  )

  return (
    <div className="grid min-h-[calc(100dvh-3.6rem)] lg:grid-cols-[16rem_minmax(0,1fr)]">
      {/* ── Conversations ────────────────────────────────────────────── */}
      <aside className="hidden border-r border-line bg-white/40 lg:block">
        <div className="flex items-center justify-between gap-2 px-4 py-4">
          <span className="label-tech-sm text-ink-muted">Conversations</span>
          <button
            type="button"
            onClick={() => router.push('/app/chat')}
            className="hairline grid h-7 w-7 place-items-center rounded-full bg-white transition-colors hover:bg-ember-50"
            aria-label="New conversation"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {!persisted ? (
          <p className="px-4 pb-4 text-[0.75rem] leading-relaxed text-ink-muted">
            No database is configured, so conversations are not saved. This one lives until you reload.
          </p>
        ) : conversations.length === 0 ? (
          <p className="px-4 pb-4 text-[0.75rem] leading-relaxed text-ink-muted">
            No conversations yet.
          </p>
        ) : (
          <ul className="space-y-0.5 px-2 pb-4">
            {conversations.map((conversation) => (
              <li key={conversation.id} className="group relative">
                <button
                  type="button"
                  onClick={() => router.push(`/app/chat/${conversation.id}`)}
                  className={cn(
                    'w-full rounded-xl px-3 py-2 pr-9 text-left transition-colors',
                    conversation.id === conversationId
                      ? 'bg-white shadow-[0_1px_2px_rgba(23,19,15,0.05)]'
                      : 'hover:bg-white/70',
                  )}
                >
                  <span className="block truncate text-[0.8125rem] text-ink">{conversation.title}</span>
                  <span className="num mt-0.5 block text-[0.625rem] text-ink-muted">
                    {formatRelativeTime(conversation.updatedAt)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void remove(conversation.id)}
                  aria-label={`Delete ${conversation.title}`}
                  className="absolute top-2.5 right-2 grid h-6 w-6 place-items-center rounded-md text-ink-faint opacity-0 transition-opacity group-hover:opacity-100 hover:bg-critical-soft hover:text-critical focus-visible:opacity-100"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* ── Thread ───────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-col">
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-3xl">
            {messages.length === 0 ? (
              <EmptyThread onPick={(prompt) => void send(prompt)} />
            ) : (
              <ul className="space-y-6">
                <AnimatePresence initial={false}>
                  {messages.map((message) => (
                    <motion.li
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <MessageBubble message={message} />
                    </motion.li>
                  ))}
                </AnimatePresence>

                {busy ? (
                  <li>
                    <div className="flex items-center gap-3 text-ink-muted">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line bg-white">
                        <ZefiMark className="h-3.5 w-3.5" />
                      </span>
                      <span className="flex items-center gap-2 text-[0.875rem]">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        Interpreting, resolving against the registry, validating…
                      </span>
                    </div>
                  </li>
                ) : null}
              </ul>
            )}
            <div ref={endRef} />
          </div>
        </div>

        {/* ── Composer ───────────────────────────────────────────────── */}
        <div className="sticky bottom-0 border-t border-line bg-ivory/85 px-4 py-4 backdrop-blur-xl sm:px-6">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void send(input)
            }}
            className="mx-auto max-w-3xl"
          >
            <div className="panel-solid flex items-end gap-2 p-2">
              <label htmlFor="chat-input" className="sr-only">
                Ask ZeFi
              </label>
              <textarea
                id="chat-input"
                ref={textareaRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    void send(input)
                  }
                }}
                rows={1}
                maxLength={4000}
                placeholder="Ask about your wallet, or describe a transaction in your own words…"
                className="max-h-40 min-h-[2.5rem] flex-1 resize-none bg-transparent px-3 py-2.5 text-[0.9375rem] text-ink placeholder:text-ink-faint focus:outline-none"
              />
              <button
                type="submit"
                disabled={busy || input.trim().length === 0}
                className="btn btn-primary grid h-9 w-9 shrink-0 place-items-center !p-0"
                aria-label="Send message"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
            <p className="mt-2 text-center text-[0.6875rem] leading-relaxed text-ink-muted">
              {address
                ? 'Wallet connected — ZeFi can read balances for wallet-aware answers.'
                : 'No wallet connected. Connect one for wallet-aware answers; ZeFi will say so rather than estimating.'}
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-ink px-4 py-2.5 text-[0.9375rem] leading-relaxed text-ivory [overflow-wrap:anywhere]">
          {message.content}
        </p>
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <span
        className={cn(
          'mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border bg-white',
          message.failed ? 'border-critical/30' : 'border-line',
        )}
      >
        {message.failed ? (
          <AlertTriangle className="h-3.5 w-3.5 text-critical" aria-hidden="true" />
        ) : (
          <ZefiMark className="h-3.5 w-3.5" />
        )}
      </span>

      <div className="min-w-0 flex-1 space-y-4">
        {message.notices?.map((notice) => (
          <p
            key={notice.code}
            className={cn(
              'rounded-xl border px-3.5 py-2.5 text-[0.8125rem] leading-relaxed',
              notice.kind === 'critical'
                ? 'border-critical/20 bg-critical-soft/60 text-ink-soft'
                : notice.kind === 'caution'
                  ? 'border-caution/20 bg-caution-soft/60 text-ink-soft'
                  : 'border-line bg-ivory/70 text-ink-soft',
            )}
          >
            {notice.message}
          </p>
        ))}

        <RichText
          content={message.content}
          className={cn(
            'text-[0.9375rem] leading-relaxed',
            message.failed ? 'text-critical' : 'text-ink-soft',
          )}
        />

        {message.plan ? <PlanCard plan={message.plan} compact /> : null}
      </div>
    </div>
  )
}

function EmptyThread({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="py-10 text-center">
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-full border border-line bg-white">
        <ZefiMark className="h-5 w-5" />
      </span>
      <h2 className="display-md mt-5 text-ink">Ask crypto anything</h2>
      <p className="mx-auto mt-2 max-w-md text-[0.9375rem] leading-relaxed text-ink-soft">
        Explanations, wallet questions, or a transaction described in plain language. ZeFi will show you
        its reasoning before it shows you a transaction.
      </p>

      <ul className="mx-auto mt-7 grid max-w-2xl gap-2 sm:grid-cols-2">
        {QUICK_PROMPTS.map((prompt) => (
          <li key={prompt}>
            <button
              type="button"
              onClick={() => onPick(prompt)}
              className="hairline w-full rounded-xl bg-white/70 px-4 py-3 text-left text-[0.875rem] leading-snug text-ink-soft transition-colors hover:bg-white hover:text-ink"
            >
              {prompt}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
