import { UserProfile } from '@clerk/nextjs'
import type { Metadata } from 'next'
import Link from 'next/link'

import { AppPageHeader, AppSection } from '@/components/app/page-header'
import { requireUser } from '@/lib/auth/session'
import { getChainById } from '@/lib/chains/registry'
import { describeCapabilities, serverEnv } from '@/lib/config/env'
import { listWalletConnections, usageInLastDays } from '@/lib/db/repositories'
import { cn, formatRelativeTime, truncateAddress } from '@/lib/utils'

export const metadata: Metadata = { title: 'Settings' }
export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const user = await requireUser()
  const capabilities = describeCapabilities()

  const [wallets, usage] = user.userId
    ? await Promise.all([
        listWalletConnections(user.userId),
        usageInLastDays(user.userId, 30),
      ])
    : [[], []]

  return (
    <AppSection>
      <AppPageHeader
        title="Settings"
        description="Your account, the wallets ZeFi has seen, and exactly what this deployment is configured to do."
      />

      <div className="mt-8 grid gap-6">
        {/* The embedded Clerk panel gets a full-width row of its own. In a
            narrow column it overflows and clips its right-aligned row actions
            ("Update profile" reduced to a sliver of its first letter). */}
        <div className="order-2 space-y-6">
          <section>
            <h2 className="label-tech text-ink-soft">Account</h2>
            <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-white">
              <UserProfile
                routing="hash"
                appearance={{
                  elements: {
                    rootBox: 'w-full',
                    cardBox: 'w-full shadow-none border-0',
                    card: 'shadow-none border-0',
                    navbar: 'hidden',
                    navbarMobileMenuRow: 'hidden',
                    scrollBox: 'rounded-none',
                  },
                }}
              />
            </div>
          </section>
        </div>

        <aside className="order-1 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <section className="panel-solid p-5">
            <h2 className="label-tech text-ink-soft">Deployment capabilities</h2>
            <dl className="mt-4 space-y-2.5">
              <Row label="Authentication" value={capabilities.auth} />
              <Row label="Persistence" value={capabilities.persistence} />
              <Row label="AI provider" value={capabilities.ai} />
              <Row label="Deep simulation" value={capabilities.deepSimulation} />
              <Row label="Swap routing" value={capabilities.swapRouting} />
              <Row label="Bridge routing" value={capabilities.bridgeRouting} />
              <Row label="Portfolio pricing" value={capabilities.portfolioPricing} />
              <Row label="Execution" value={capabilities.execution} />
              <Row label="Demo mode" value={capabilities.demoMode ? 'on' : 'off'} />
            </dl>
            <Link href="/docs#environment" className="link-underline mt-4 inline-block text-[0.75rem] text-ink">
              Configuration reference
            </Link>
          </section>

          <section className="panel-solid p-5">
            <h2 className="label-tech text-ink-soft">Wallets seen</h2>
            {wallets.length === 0 ? (
              <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-muted">
                No wallet connections recorded. ZeFi stores only the public address, the chain id, and a
                timestamp — never key material.
              </p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {wallets.map((wallet) => (
                  <li key={wallet.id}>
                    <p className="num text-[0.8125rem] text-ink">{truncateAddress(wallet.address)}</p>
                    <p className="mt-0.5 text-[0.6875rem] text-ink-muted">
                      {wallet.label ? `${wallet.label} · ` : ''}
                      {getChainById(wallet.chainId)?.shortName ?? `Chain ${wallet.chainId}`} ·{' '}
                      {formatRelativeTime(wallet.lastSeenAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel-quiet p-5">
            <h2 className="label-tech text-ink-soft">Usage · last 30 days</h2>
            {usage.length === 0 ? (
              <p className="mt-3 text-[0.8125rem] text-ink-muted">No recorded usage.</p>
            ) : (
              <dl className="mt-3 space-y-1.5">
                {usage.map((row) => (
                  <div key={row.actionType} className="flex items-baseline justify-between gap-3">
                    <dt className="num text-[0.75rem] text-ink-soft">{row.actionType}</dt>
                    <dd className="num text-[0.8125rem] text-ink">{row._sum.units ?? 0}</dd>
                  </div>
                ))}
              </dl>
            )}
            <p className="num mt-4 border-t border-line pt-3 text-[0.625rem] leading-relaxed text-ink-muted">
              Limit · {serverEnv.rateLimit.aiPerMinute}/min · {serverEnv.rateLimit.aiPerDay}/day
            </p>
          </section>

          <section className="panel-quiet p-5">
            <h2 className="label-tech text-ink-soft">Data and deletion</h2>
            <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-soft">
              Deleting your account removes your profile and every row that hangs off it — conversations,
              plans, wallet connections, transaction records, usage and activity — by cascade rather than
              by flag. Onchain transactions cannot be deleted by anyone, including ZeFi.
            </p>
            <Link href="/privacy" className="link-underline mt-3 inline-block text-[0.75rem] text-ink">
              Privacy policy
            </Link>
          </section>
        </aside>
      </div>
    </AppSection>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  const good = ['configured', 'on', 'native-and-erc20-transfers'].includes(value)
  const bad = ['unavailable', 'disabled'].includes(value)
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="data-key">{label}</dt>
      <dd>
        <span
          className={cn(
            'whitespace-nowrap',
            good ? 'chip chip-positive' : bad ? 'chip chip-caution' : 'chip',
          )}
        >
          {value}
        </span>
      </dd>
    </div>
  )
}
