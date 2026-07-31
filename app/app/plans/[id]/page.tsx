import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AppSection } from '@/components/app/page-header'
import { ApprovalFlow } from '@/components/app/plan/approval-flow'
import { PlanCard, PlanDisclaimer } from '@/components/plan/plan-card'
import { requireUser } from '@/lib/auth/session'
import { explorerTxUrl, getChainById } from '@/lib/chains/registry'
import { deserialisePlan, getPlan } from '@/lib/db/repositories'
import { formatDateTime, truncateAddress } from '@/lib/utils'

export const metadata: Metadata = { title: 'Transaction plan' }
export const dynamic = 'force-dynamic'

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await params

  // Scoped by userId inside the repository. A plan belonging to another account
  // is indistinguishable from one that does not exist.
  const row = user.userId ? await getPlan(user.userId, id) : null
  if (!row) notFound()

  const plan = deserialisePlan(row.planData)
  if (!plan) notFound()

  // The stored status is the authority; the serialised snapshot may be older.
  const current = { ...plan, status: row.status }

  return (
    <AppSection>
      <Link
        href="/app/plans"
        className="link-underline inline-flex items-center gap-1.5 text-[0.8125rem] text-ink-soft"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        All plans
      </Link>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        <PlanCard plan={current} footer={<ApprovalFlow plan={current} planRecordId={row.id} />} />

        <aside className="space-y-4 lg:sticky lg:top-24">
          <section className="panel-solid p-5">
            <h2 className="label-tech text-ink-soft">Approval flow</h2>
            <ol className="mt-4 space-y-2.5">
              {[
                'Your request',
                'Intent extraction',
                'Missing-field resolution',
                'Plan construction',
                'Risk review',
                'Simulation',
                'Human-readable summary',
                'Your explicit confirmation',
                'Wallet signature',
                'Submission',
                'Status monitoring',
                'Final receipt',
              ].map((step, index) => (
                <li key={step} className="flex gap-3 text-[0.8125rem] leading-snug">
                  <span className="num text-[0.6875rem] text-ember-700">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="text-ink-soft">{step}</span>
                </li>
              ))}
            </ol>
          </section>

          {row.records.length > 0 ? (
            <section className="panel-solid p-5">
              <h2 className="label-tech text-ink-soft">Transactions</h2>
              <ul className="mt-3 space-y-3">
                {row.records.map((record) => {
                  const chain = getChainById(record.chainId)
                  const url = chain ? explorerTxUrl(chain.key, record.transactionHash) : null
                  return (
                    <li key={record.id} className="rounded-xl border border-line bg-ivory/60 p-3.5">
                      <div className="flex items-center justify-between gap-3">
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
                        <span className="text-[0.6875rem] text-ink-muted">
                          {chain?.shortName ?? record.chainId}
                        </span>
                      </div>
                      <p className="num mt-2 text-[0.75rem] break-all text-ink-soft">
                        {truncateAddress(record.transactionHash, 12, 10)}
                      </p>
                      <p className="num mt-1 text-[0.625rem] text-ink-muted">
                        {formatDateTime(record.submittedAt)}
                      </p>
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="link-underline mt-2 inline-block text-[0.75rem] text-ink"
                        >
                          View on explorer
                        </a>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : null}

          <PlanDisclaimer />
        </aside>
      </div>
    </AppSection>
  )
}
