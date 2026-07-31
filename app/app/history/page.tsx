import type { Metadata } from 'next'
import Link from 'next/link'

import { AppPageHeader, AppSection, EmptyState } from '@/components/app/page-header'
import { requireUser } from '@/lib/auth/session'
import { explorerTxUrl, getChainById } from '@/lib/chains/registry'
import { persistenceAvailable } from '@/lib/db/client'
import { listActivity, listTransactions } from '@/lib/db/repositories'
import { formatDateTime, formatRelativeTime, truncateAddress } from '@/lib/utils'

export const metadata: Metadata = { title: 'History' }
export const dynamic = 'force-dynamic'

export default async function HistoryPage() {
  const user = await requireUser()
  const [transactions, activity] = user.userId
    ? await Promise.all([listTransactions(user.userId), listActivity(user.userId, 40)])
    : [[], []]

  return (
    <AppSection>
      <AppPageHeader
        title="History"
        description="Transactions your wallet submitted through ZeFi, and a log of every action taken on this account."
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
        <section>
          <h2 className="label-tech text-ink-soft">Transactions</h2>

          {!persistenceAvailable() ? (
            <div className="mt-4">
              <EmptyState
                title="History is not being recorded"
                body="No database is configured on this deployment, so ZeFi keeps no record of submissions. Transactions you sign are still onchain — ZeFi simply cannot show them here."
              />
            </div>
          ) : transactions.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="No transactions yet"
                body="Once you approve a plan and your wallet broadcasts it, the hash and its status appear here."
                action={
                  <Link href="/app/plans" className="btn btn-ghost btn-sm">
                    View plans
                  </Link>
                }
              />
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {transactions.map((record) => {
                const chain = getChainById(record.chainId)
                const url = chain ? explorerTxUrl(chain.key, record.transactionHash) : null
                return (
                  <li key={record.id} className="panel-solid p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={
                          record.status === 'confirmed'
                            ? 'chip chip-positive'
                            : record.status === 'failed'
                              ? 'chip chip-critical'
                              : 'chip chip-info'
                        }
                      >
                        {record.status}
                      </span>
                      <span className="text-[0.75rem] text-ink-muted">
                        {chain?.name ?? `Chain ${record.chainId}`}
                      </span>
                    </div>

                    <p className="num mt-3 text-[0.8125rem] break-all text-ink">
                      {truncateAddress(record.transactionHash, 14, 12)}
                    </p>

                    <dl className="mt-3 space-y-1 border-t border-line pt-3">
                      <div className="flex justify-between gap-3">
                        <dt className="data-key">Submitted</dt>
                        <dd className="num text-[0.75rem] text-ink-soft">
                          {formatDateTime(record.submittedAt)}
                        </dd>
                      </div>
                      {record.confirmedAt ? (
                        <div className="flex justify-between gap-3">
                          <dt className="data-key">Confirmed</dt>
                          <dd className="num text-[0.75rem] text-ink-soft">
                            {formatDateTime(record.confirmedAt)}
                          </dd>
                        </div>
                      ) : null}
                    </dl>

                    <div className="mt-3 flex flex-wrap gap-3">
                      <Link
                        href={`/app/plans/${record.planId}`}
                        className="link-underline text-[0.75rem] text-ink"
                      >
                        View plan
                      </Link>
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="link-underline text-[0.75rem] text-ink"
                        >
                          View on explorer
                        </a>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section>
          <h2 className="label-tech text-ink-soft">Activity log</h2>
          {activity.length === 0 ? (
            <p className="mt-4 text-[0.875rem] leading-relaxed text-ink-muted">
              No activity recorded yet.
            </p>
          ) : (
            <ul className="panel-quiet mt-4 divide-y divide-line p-1">
              {activity.map((event) => (
                <li key={event.id} className="flex items-baseline justify-between gap-3 px-3 py-2.5">
                  <span className="num text-[0.75rem] text-ink-soft">{event.action}</span>
                  <span className="text-[0.625rem] whitespace-nowrap text-ink-muted">
                    {formatRelativeTime(event.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[0.6875rem] leading-relaxed text-ink-muted">
            Scoped to your account. Every mutation ZeFi performs on your behalf is recorded here.
          </p>
        </section>
      </div>
    </AppSection>
  )
}
