import { ArrowUpRight, MessageSquare, Sparkles, Wallet } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { AppPageHeader, AppSection, EmptyState } from '@/components/app/page-header'
import { QuickPrompts } from '@/components/app/quick-prompts'
import { WalletSummaryCard } from '@/components/app/wallet-summary-card'
import { RoutefoldMark } from '@/components/brand/routefold-mark'
import { PlanStatusBadge } from '@/components/plan/status-badge'
import { requireUser } from '@/lib/auth/session'
import { getChainById } from '@/lib/chains/registry'
import { describeCapabilities, serverEnv } from '@/lib/config/env'
import { publicConfig } from '@/lib/config/public'
import { persistenceAvailable } from '@/lib/db/client'
import {
  deserialisePlan,
  listActivity,
  listConversations,
  listPlans,
  listWalletConnections,
  usageInLastDays,
} from '@/lib/db/repositories'
import type { PlanStatus } from '@/lib/planner/types'
import { formatRelativeTime, truncateAddress } from '@/lib/utils'

export const metadata: Metadata = { title: 'Overview' }
export const dynamic = 'force-dynamic'

export default async function AppOverviewPage() {
  const user = await requireUser()
  const capabilities = describeCapabilities()

  const [conversations, plans, wallets, activity, usage] = user.userId
    ? await Promise.all([
        listConversations(user.userId, 5),
        listPlans(user.userId, 5),
        listWalletConnections(user.userId),
        listActivity(user.userId, 6),
        usageInLastDays(user.userId, 30),
      ])
    : [[], [], [], [], []]

  const greeting = user.displayName ? `Welcome back, ${user.displayName}` : 'Welcome to ZeFi'
  const turns = usage.find((row) => row.actionType === 'assistant_turn')?._sum.units ?? 0
  const generated = usage.find((row) => row.actionType === 'plan_generation')?._sum.units ?? 0

  return (
    <AppSection>
      <AppPageHeader
        title={greeting}
        description="Ask a question about your wallet, or describe a transaction in plain language. ZeFi builds the plan; you decide whether it happens."
        action={
          <Link href="/app/chat" className="btn btn-primary">
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            New conversation
          </Link>
        }
      />

      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <QuickPrompts />

          {/* ── Recent conversations ─────────────────────────────────── */}
          <section className="panel-solid p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="label-tech text-ink-soft">Recent conversations</h2>
              <Link href="/app/chat" className="link-underline text-[0.8125rem] text-ink-soft">
                All
              </Link>
            </div>

            {!persistenceAvailable() ? (
              <p className="mt-4 text-[0.875rem] leading-relaxed text-ink-muted">
                No database is configured on this deployment, so conversations are not saved between
                requests. Set <span className="num text-ink">DATABASE_URL</span> to enable history.
              </p>
            ) : conversations.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="No conversations yet"
                  body="Your history will appear here once you start one. ZeFi does not populate new accounts with example data."
                  action={
                    <Link href="/app/chat" className="btn btn-ghost btn-sm">
                      Start a conversation
                    </Link>
                  }
                />
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {conversations.map((conversation) => (
                  <li key={conversation.id}>
                    <Link
                      href={`/app/chat/${conversation.id}`}
                      className="-mx-2 flex items-center justify-between gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-ember-50/60"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[0.9375rem] text-ink">
                          {conversation.title}
                        </span>
                        <span className="num mt-0.5 block text-[0.6875rem] text-ink-muted">
                          {conversation._count.messages} message
                          {conversation._count.messages === 1 ? '' : 's'} ·{' '}
                          {formatRelativeTime(conversation.updatedAt)}
                        </span>
                      </span>
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── Saved plans ──────────────────────────────────────────── */}
          <section className="panel-solid p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="label-tech text-ink-soft">Saved transaction plans</h2>
              <Link href="/app/plans" className="link-underline text-[0.8125rem] text-ink-soft">
                All
              </Link>
            </div>

            {plans.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="No plans yet"
                  body="Describe a transfer, swap or bridge in the assistant and ZeFi will build a plan you can review here."
                  action={
                    <Link href="/app/chat" className="btn btn-ghost btn-sm">
                      Describe a transaction
                    </Link>
                  }
                />
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {plans.map((row) => {
                  const plan = deserialisePlan(row.planData)
                  return (
                    <li key={row.id}>
                      <Link
                        href={`/app/plans/${row.id}`}
                        className="-mx-2 flex items-center justify-between gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-ember-50/60"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[0.9375rem] text-ink">
                            {plan?.interpretedIntent ?? row.intent.intentType}
                          </span>
                          <span className="num mt-0.5 block text-[0.6875rem] text-ink-muted">
                            {row.intent.intentType} · {formatRelativeTime(row.updatedAt)}
                          </span>
                        </span>
                        <PlanStatusBadge status={row.status as PlanStatus} />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>

        {/* ── Right column ───────────────────────────────────────────── */}
        <div className="space-y-4">
          <WalletSummaryCard />

          <section className="panel-solid p-5">
            <h2 className="label-tech text-ink-soft">Security state</h2>
            <ul className="mt-4 space-y-2.5">
              <StateRow label="Custody" value="Your wallet" tone="positive" />
              <StateRow
                label="Execution"
                value={serverEnv.flags.executionEnabled ? 'Transfers enabled' : 'Disabled'}
                tone={serverEnv.flags.executionEnabled ? 'positive' : 'neutral'}
              />
              <StateRow
                label="Deep simulation"
                value={capabilities.deepSimulation === 'configured' ? 'Configured' : 'Local only'}
                tone={capabilities.deepSimulation === 'configured' ? 'positive' : 'caution'}
              />
              <StateRow
                label="Approvals"
                value="Exact-amount only"
                tone="positive"
              />
            </ul>
            <p className="mt-4 border-t border-line pt-3 text-[0.75rem] leading-relaxed text-ink-muted">
              ZeFi never requests or stores seed phrases or private keys.
            </p>
          </section>

          <section className="panel-solid p-5">
            <h2 className="label-tech text-ink-soft">Usage · last 30 days</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <dt className="label-tech-sm text-ink-muted">Assistant turns</dt>
                <dd className="num mt-1 text-[1.25rem] text-ink">{turns}</dd>
              </div>
              <div>
                <dt className="label-tech-sm text-ink-muted">Plans generated</dt>
                <dd className="num mt-1 text-[1.25rem] text-ink">{generated}</dd>
              </div>
            </dl>
            <p className="num mt-4 border-t border-line pt-3 text-[0.6875rem] leading-relaxed text-ink-muted">
              Limit · {serverEnv.rateLimit.aiPerMinute}/min · {serverEnv.rateLimit.aiPerDay}/day
            </p>
          </section>

          {wallets.length > 0 ? (
            <section className="panel-solid p-5">
              <h2 className="label-tech text-ink-soft">Recent wallets</h2>
              <ul className="mt-3 space-y-2">
                {wallets.slice(0, 4).map((wallet) => (
                  <li key={wallet.id} className="flex items-center justify-between gap-3">
                    <span className="num text-[0.8125rem] text-ink">
                      {truncateAddress(wallet.address)}
                    </span>
                    <span className="text-[0.6875rem] text-ink-muted">
                      {getChainById(wallet.chainId)?.shortName ?? `Chain ${wallet.chainId}`} ·{' '}
                      {formatRelativeTime(wallet.lastSeenAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <a
            href={publicConfig.routefoldUrl}
            {...(publicConfig.routefoldIsExternal
              ? { target: '_blank', rel: 'noreferrer noopener' }
              : {})}
            className="panel-solid block p-5 transition-colors hover:bg-white"
          >
            <div className="flex items-center gap-2.5">
              <RoutefoldMark className="h-5 w-5" />
              <span className="font-display text-[0.9375rem] font-medium text-ink">Routefold</span>
              <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-ink-faint" aria-hidden="true" />
            </div>
            <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-soft">
              Model the next chain before you move — multichain expansion intelligence for onchain
              products.
            </p>
          </a>

          {activity.length > 0 ? (
            <section className="panel-quiet p-5">
              <h2 className="label-tech text-ink-soft">Recent activity</h2>
              <ul className="mt-3 space-y-2">
                {activity.map((event) => (
                  <li key={event.id} className="flex items-baseline justify-between gap-3">
                    <span className="num text-[0.75rem] text-ink-soft">{event.action}</span>
                    <span className="text-[0.6875rem] whitespace-nowrap text-ink-muted">
                      {formatRelativeTime(event.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-2.5">
        <Link href="/app/wallet" className="btn btn-ghost btn-sm">
          <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
          Wallet intelligence
        </Link>
        <Link href="/app/plans" className="btn btn-ghost btn-sm">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Transaction plans
        </Link>
      </div>
    </AppSection>
  )
}

function StateRow({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'positive' | 'caution' | 'neutral'
}) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="data-key">{label}</span>
      <span
        className={
          tone === 'positive' ? 'chip chip-positive' : tone === 'caution' ? 'chip chip-caution' : 'chip'
        }
      >
        {value}
      </span>
    </li>
  )
}
