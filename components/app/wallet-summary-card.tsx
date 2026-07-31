'use client'

import { Loader2, Wallet } from 'lucide-react'
import Link from 'next/link'
import { useAccount, useChainId } from 'wagmi'

import { WalletButton } from '@/components/wallet/wallet-button'
import { getChainById } from '@/lib/chains/registry'
import { formatTokenAmount, truncateAddress } from '@/lib/utils'
import { useBalances } from '@/lib/wallet/use-balances'

/**
 * A compact wallet reading for the dashboard.
 *
 * Four states, all distinct: not connected, reading, read, and failed. A failed
 * read shows the failure — never a zero.
 */
export function WalletSummaryCard() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const chain = getChainById(chainId)

  const balances = useBalances(
    isConnected ? address : undefined,
    chain ? [chain.key] : undefined,
  )

  return (
    <section className="panel-solid p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="label-tech text-ink-soft">Connected wallet</h2>
        {isConnected ? <span className="chip chip-positive">Connected</span> : null}
      </div>

      {!isConnected ? (
        <div className="mt-4">
          <span className="grid h-9 w-9 place-items-center rounded-full border border-line bg-ivory">
            <Wallet className="h-4 w-4 text-ink-faint" aria-hidden="true" />
          </span>
          <p className="mt-3 text-[0.875rem] leading-relaxed text-ink-soft">
            No wallet connected. ZeFi reads balances only — it never requests a seed phrase or a private
            key, and it cannot initiate anything on its own.
          </p>
          <div className="mt-4">
            <WalletButton />
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <p className="num text-[0.875rem] break-all text-ink">{truncateAddress(address ?? '', 10, 8)}</p>

          {balances.isPending ? (
            <p className="mt-4 flex items-center gap-2 text-[0.8125rem] text-ink-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Reading balances…
            </p>
          ) : null}

          {balances.isError ? (
            <p className="mt-4 rounded-xl border border-critical/20 bg-critical-soft/60 px-3 py-2.5 text-[0.8125rem] leading-relaxed text-ink-soft">
              {balances.error instanceof Error ? balances.error.message : 'Balance read failed.'} ZeFi
              shows nothing rather than a zero it cannot verify.
            </p>
          ) : null}

          {balances.data
            ? balances.data.snapshots.map((snapshot) => {
                const definition = getChainById(chainId)
                const rows = [...(snapshot.native ? [snapshot.native] : []), ...snapshot.tokens]
                return (
                  <div key={snapshot.chainKey} className="mt-4">
                    <p className="label-tech-sm text-ink-muted">
                      {definition?.name ?? snapshot.chainKey}
                    </p>
                    {rows.length === 0 ? (
                      <p className="mt-2 text-[0.8125rem] text-ink-muted">
                        No registry assets with a non-zero balance here.
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-1.5">
                        {rows.map((row) => (
                          <li key={row.symbol} className="flex items-center justify-between gap-3">
                            <span className="text-[0.875rem] text-ink">{row.symbol}</span>
                            <span className="num text-[0.8125rem] text-ink-soft">
                              {formatTokenAmount(row.amount)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })
            : null}

          {balances.data && balances.data.errors.length > 0 ? (
            <p className="mt-3 text-[0.6875rem] leading-relaxed text-caution">
              {balances.data.errors.length} read{balances.data.errors.length === 1 ? '' : 's'} failed and
              are omitted rather than shown as zero.
            </p>
          ) : null}

          {balances.data ? (
            <p className="num mt-3 border-t border-line pt-3 text-[0.6875rem] text-ink-muted">
              Read {new Date(balances.data.readAt).toLocaleTimeString('en-US')}
            </p>
          ) : null}

          <Link href="/app/wallet" className="btn btn-ghost btn-sm mt-4 w-full">
            Wallet intelligence
          </Link>
        </div>
      )}
    </section>
  )
}
