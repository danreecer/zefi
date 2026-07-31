import type { Metadata } from 'next'
import Link from 'next/link'

import { AppPageHeader, AppSection, EmptyState } from '@/components/app/page-header'
import { PlanStatusBadge } from '@/components/plan/status-badge'
import { requireUser } from '@/lib/auth/session'
import { getChain } from '@/lib/chains/registry'
import { persistenceAvailable } from '@/lib/db/client'
import { deserialisePlan, listPlans } from '@/lib/db/repositories'
import type { PlanStatus } from '@/lib/planner/types'
import { formatRelativeTime } from '@/lib/utils'

export const metadata: Metadata = { title: 'Transaction plans' }
export const dynamic = 'force-dynamic'

export default async function PlansPage() {
  const user = await requireUser()
  const plans = user.userId ? await listPlans(user.userId, 50) : []

  return (
    <AppSection>
      <AppPageHeader
        title="Transaction plans"
        description="Every plan ZeFi has built for you, with the status it reached. A plan is not a transaction — nothing here has been submitted unless it says so."
        action={
          <Link href="/app/chat" className="btn btn-primary btn-sm">
            Describe a transaction
          </Link>
        }
      />

      <div className="mt-8">
        {!persistenceAvailable() ? (
          <EmptyState
            title="Plans are not being saved"
            body={
              <>
                No database is configured on this deployment. ZeFi still builds and validates plans in
                the assistant — they simply do not persist. Set{' '}
                <span className="num text-ink">DATABASE_URL</span> to keep them.
              </>
            }
            action={
              <Link href="/app/chat" className="btn btn-ghost btn-sm">
                Open the assistant
              </Link>
            }
          />
        ) : plans.length === 0 ? (
          <EmptyState
            title="No plans yet"
            body="Describe a transfer, swap or bridge in plain language and ZeFi will build a plan with its actions, fees, approvals and risks laid out."
            action={
              <Link href="/app/chat" className="btn btn-ghost btn-sm">
                Describe a transaction
              </Link>
            }
          />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {plans.map((row) => {
              const plan = deserialisePlan(row.planData)
              const chain = getChain(plan?.actions[0]?.chainKey ?? plan?.intent.sourceNetwork ?? '')
              const record = row.records[0]

              return (
                <li key={row.id}>
                  <Link
                    href={`/app/plans/${row.id}`}
                    className="panel-solid block h-full p-5 transition-colors hover:bg-white"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <span className="chip chip-ember">{row.intent.intentType}</span>
                      <PlanStatusBadge status={row.status as PlanStatus} />
                    </div>

                    <p className="mt-3 text-[0.9375rem] leading-snug break-words text-ink">
                      {plan?.interpretedIntent ?? 'Transaction plan'}
                    </p>

                    <dl className="mt-4 space-y-1.5 border-t border-line pt-3">
                      <MicroRow label="Network" value={chain?.name ?? '—'} />
                      <MicroRow
                        label="Steps"
                        value={plan ? `${plan.actions.length}` : '—'}
                      />
                      <MicroRow
                        label="Network cost"
                        value={
                          plan?.estimates.networkCostNative
                            ? `${plan.estimates.networkCostNative} ${plan.estimates.networkCostSymbol ?? ''}`.trim()
                            : 'Not established'
                        }
                      />
                      {record ? (
                        <MicroRow label="Transaction" value={record.status} />
                      ) : null}
                    </dl>

                    <p className="num mt-3 text-[0.6875rem] text-ink-muted">
                      Updated {formatRelativeTime(row.updatedAt)}
                    </p>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </AppSection>
  )
}

function MicroRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="data-key">{label}</dt>
      <dd className="num text-[0.75rem] text-ink-soft">{value}</dd>
    </div>
  )
}
