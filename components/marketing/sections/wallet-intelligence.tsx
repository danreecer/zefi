'use client'

import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'

import { SectionHeader } from '@/components/marketing/section-header'
import { getChain } from '@/lib/chains/registry'
import { DEMO_WALLET } from '@/lib/demo/fixtures'
import { formatUsd, truncateAddress } from '@/lib/utils'

/**
 * WALLET INTELLIGENCE.
 *
 * The allocation chart earns its place: proportion is the question being asked,
 * and a ring answers it faster than a table. Everything numeric is still
 * available as text, so the chart is an aid rather than the only route to the
 * information.
 */

const RING_COLORS = ['#ED4F08', '#FF9A3D', '#FFB98D', '#2C3C60'] as const

export function WalletIntelligenceSection() {
  const stablecoinUsd = DEMO_WALLET.chains
    .flatMap((chain) => chain.positions)
    .filter((position) => position.kind === 'stablecoin')
    .reduce((sum, position) => sum + position.valueUsd, 0)

  const stablecoinShare = (stablecoinUsd / DEMO_WALLET.totalUsd) * 100

  const allocation = DEMO_WALLET.chains.map((chain, index) => ({
    name: getChain(chain.chainKey)?.shortName ?? chain.chainKey,
    value: chain.valueUsd,
    fill: RING_COLORS[index % RING_COLORS.length] as string,
  }))

  return (
    <section className="section" id="wallet-intelligence">
      <div className="shell">
        <SectionHeader
          eyebrow="Wallet intelligence"
          title={
            <>
              Your wallet,
              <br />
              in sentences
            </>
          }
          lede="A balance list tells you what you hold. ZeFi tells you what it means — concentration, issuer exposure, gas headroom, and which positions carry contract risk you may not have priced."
        />

        <div className="mt-12 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:gap-6">
          {/* ── Allocation ───────────────────────────────────────────── */}
          <div className="panel-solid p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="label-tech-sm text-ink-muted">Connected wallet</p>
                <p className="num mt-1 text-[0.875rem] text-ink">
                  {truncateAddress(DEMO_WALLET.address)}
                </p>
              </div>
              <span className="chip chip-ember">Illustrative</span>
            </div>

            <div className="mt-5 flex items-center gap-6">
              <div className="relative h-[132px] w-[132px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocation}
                      dataKey="value"
                      innerRadius={46}
                      outerRadius={64}
                      paddingAngle={2}
                      stroke="none"
                      isAnimationActive={false}
                    >
                      {allocation.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                  <div>
                    <p className="num text-[1.0625rem] leading-none text-ink">
                      {formatUsd(DEMO_WALLET.totalUsd)}
                    </p>
                    <p className="label-tech-sm mt-1 text-ink-muted">Total</p>
                  </div>
                </div>
              </div>

              <ul className="min-w-0 flex-1 space-y-2">
                {allocation.map((entry) => (
                  <li key={entry.name} className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: entry.fill }}
                      />
                      <span className="truncate text-[0.875rem] text-ink">{entry.name}</span>
                    </span>
                    <span className="num shrink-0 text-[0.8125rem] text-ink-soft">
                      {formatUsd(entry.value)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-5 border-t border-line pt-4">
              <div className="data-row">
                <span className="data-key">Stablecoin exposure</span>
                <span className="data-val">{stablecoinShare.toFixed(1)}%</span>
              </div>
              <div className="data-row">
                <span className="data-key">Issuers</span>
                <span className="data-val">1 · USDC only</span>
              </div>
              <div className="data-row">
                <span className="data-key">Networks read</span>
                <span className="data-val">{DEMO_WALLET.chains.length}</span>
              </div>
            </div>

            <p className="mt-4 text-[0.6875rem] leading-relaxed text-ink-muted">
              Covers assets in ZeFi’s verified registry only. Tokens outside it are not counted, and the
              interface says so rather than implying the total is complete.
            </p>
          </div>

          {/* ── Reading ──────────────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="panel-solid p-5 sm:p-6">
              <p className="label-tech-sm text-ink-muted">ZeFi’s reading</p>
              <p className="mt-3 text-[1.0625rem] leading-relaxed text-ink">
                Just over half this portfolio is a single issuer’s liability, not a currency position.
                Splitting across issuers changes the failure mode; it does not remove it.
              </p>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">
                Gas headroom is thin on Ethereum relative to the value held there — moving those
                positions later costs more than moving them now, and a congested day could leave the
                position stranded until the wallet is topped up.
              </p>
            </div>

            <ul className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  title: 'Read-only by design',
                  body: 'ZeFi reads balances over configured RPC endpoints. It holds no keys and can initiate nothing on its own.',
                },
                {
                  title: 'Timestamped, always',
                  body: 'Every figure carries the moment it was read. A balance without a time is a balance you cannot reason about.',
                },
                {
                  title: 'Partial reads stay partial',
                  body: 'If a chain read fails, ZeFi reports the failure. It does not show a zero and let you infer the rest.',
                },
                {
                  title: 'No custody, no exceptions',
                  body: 'ZeFi never requests or stores seed phrases or private keys. Connected wallets retain custody and sign directly.',
                },
              ].map((item) => (
                <li key={item.title} className="panel-quiet p-5">
                  <h3 className="text-[0.9375rem] font-medium text-ink">{item.title}</h3>
                  <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-soft">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
