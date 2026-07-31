'use client'

import { AlertTriangle, Copy, ExternalLink, Loader2, RefreshCw, Wallet } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useAccount, useChainId } from 'wagmi'

import { WalletButton } from '@/components/wallet/wallet-button'
import { CHAINS, EXECUTABLE_CHAIN_KEYS, explorerAddressUrl, getChainById } from '@/lib/chains/registry'
import { cn, formatRelativeTime, formatTokenAmount, truncateAddress } from '@/lib/utils'
import { useBalances } from '@/lib/wallet/use-balances'

export function WalletIntelligence({
  knownConnections,
}: {
  knownConnections: Array<{
    id: string
    address: string
    chainId: number
    label: string | null
    lastSeenAt: string
  }>
}) {
  const { address, isConnected, connector } = useAccount()
  const chainId = useChainId()
  const balances = useBalances(isConnected ? address : undefined)

  const chain = getChainById(chainId)
  const unsupported = isConnected && !chain

  if (!isConnected) {
    return (
      <div className="panel-solid px-6 py-14 text-center">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-full border border-line bg-ivory">
          <Wallet className="h-5 w-5 text-ink-faint" aria-hidden="true" />
        </span>
        <h2 className="display-md mt-5 text-ink">No wallet connected</h2>
        <p className="mx-auto mt-3 max-w-md text-[0.9375rem] leading-relaxed text-ink-soft">
          Connect a wallet to read balances across {EXECUTABLE_CHAIN_KEYS.length} EVM networks. ZeFi
          never requests a seed phrase or a private key, and the connection grants it read access only.
        </p>
        <div className="mt-6 flex justify-center">
          <WalletButton />
        </div>

        {knownConnections.length > 0 ? (
          <div className="mx-auto mt-10 max-w-md border-t border-line pt-6">
            <p className="label-tech-sm text-ink-muted">Previously connected</p>
            <ul className="mt-3 space-y-2">
              {knownConnections.slice(0, 5).map((connection) => (
                <li key={connection.id} className="flex items-center justify-between gap-3">
                  <span className="num text-[0.8125rem] text-ink">
                    {truncateAddress(connection.address)}
                  </span>
                  <span className="text-[0.6875rem] text-ink-muted">
                    {getChainById(connection.chainId)?.shortName ?? connection.chainId} ·{' '}
                    {formatRelativeTime(connection.lastSeenAt)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <section className="panel-solid p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="label-tech-sm text-ink-muted">Address</p>
            <p className="num mt-1.5 text-[0.9375rem] break-all text-ink">{address}</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className={unsupported ? 'chip chip-critical' : 'chip chip-positive'}>
                {unsupported ? `Unsupported network (${chainId})` : (chain?.name ?? '')}
              </span>
              {connector?.name ? <span className="chip">{connector.name}</span> : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                if (!address) return
                void navigator.clipboard
                  .writeText(address)
                  .then(() => toast.success('Address copied'))
                  .catch(() => toast.error('Could not copy address'))
              }}
              className="btn btn-ghost btn-sm"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              Copy
            </button>
            {chain && address ? (
              <a
                href={explorerAddressUrl(chain.key, address) ?? '#'}
                target="_blank"
                rel="noreferrer noopener"
                className="btn btn-ghost btn-sm"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                Explorer
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => void balances.refetch()}
              disabled={balances.isFetching}
              className="btn btn-ghost btn-sm"
            >
              <RefreshCw
                className={cn('h-3.5 w-3.5', balances.isFetching && 'animate-spin')}
                aria-hidden="true"
              />
              Refresh
            </button>
          </div>
        </div>

        {unsupported ? (
          <p className="mt-4 rounded-xl border border-critical/20 bg-critical-soft/60 px-4 py-3 text-[0.8125rem] leading-relaxed text-ink-soft">
            Chain id {chainId} is not in ZeFi’s registry, so wallet-aware answers and plans are
            unavailable on it. Switch to a supported network from the wallet menu.
          </p>
        ) : null}
      </section>

      {/* ── Readings ───────────────────────────────────────────────── */}
      {balances.isPending ? (
        <div className="panel-solid flex items-center gap-3 p-6">
          <Loader2 className="h-4 w-4 animate-spin text-ink-muted" aria-hidden="true" />
          <p className="text-[0.9375rem] text-ink-soft">
            Reading balances across {EXECUTABLE_CHAIN_KEYS.length} networks…
          </p>
        </div>
      ) : null}

      {balances.isError ? (
        <div className="panel-solid flex gap-3 p-6">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-critical" aria-hidden="true" />
          <div>
            <p className="text-[0.9375rem] font-medium text-ink">Balance read failed</p>
            <p className="mt-1.5 text-[0.875rem] leading-relaxed text-ink-soft">
              {balances.error instanceof Error ? balances.error.message : 'Balance read failed.'}
            </p>
            <button
              type="button"
              onClick={() => void balances.refetch()}
              className="btn btn-ghost btn-sm mt-4"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Try again
            </button>
          </div>
        </div>
      ) : null}

      {balances.data ? (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {balances.data.snapshots.map((snapshot) => {
              const definition = CHAINS[snapshot.chainKey]
              const rows = [...(snapshot.native ? [snapshot.native] : []), ...snapshot.tokens]
              const failed = snapshot.errors.length > 0

              return (
                <section key={snapshot.chainKey} className="panel-solid p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-[0.9375rem] font-medium text-ink">
                      {definition?.name ?? snapshot.chainKey}
                    </h2>
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 rounded-full"
                      style={{ background: definition?.accent ?? '#A1958A' }}
                    />
                  </div>

                  {rows.length === 0 && !failed ? (
                    <p className="mt-4 text-[0.8125rem] leading-relaxed text-ink-muted">
                      No registry assets with a non-zero balance.
                    </p>
                  ) : (
                    <ul className="mt-3">
                      {rows.map((row) => (
                        <li key={`${row.symbol}-${row.address ?? 'native'}`} className="data-row">
                          <span className="text-[0.875rem] text-ink">{row.symbol}</span>
                          <span className="data-val">{formatTokenAmount(row.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {failed ? (
                    <p className="mt-3 rounded-lg border border-caution/20 bg-caution-soft/60 px-3 py-2 text-[0.6875rem] leading-relaxed text-ink-soft">
                      {snapshot.errors[0]?.reason}
                    </p>
                  ) : null}

                  <p className="num mt-3 border-t border-line pt-2.5 text-[0.625rem] text-ink-muted">
                    Read {new Date(snapshot.readAt).toLocaleTimeString('en-US')}
                  </p>
                </section>
              )
            })}
          </div>

          <div className="panel-quiet flex flex-wrap items-center justify-between gap-3 p-5">
            <p className="text-[0.8125rem] leading-relaxed text-ink-soft">
              {balances.data.errors.length === 0
                ? `All ${balances.data.snapshots.length} networks read successfully.`
                : `${balances.data.errors.length} read${balances.data.errors.length === 1 ? '' : 's'} failed. Those figures are omitted rather than shown as zero.`}{' '}
              Covers assets in ZeFi’s verified registry only.
            </p>
            <Link href="/app/chat?prompt=Explain%20what%20is%20in%20my%20wallet." className="btn btn-primary btn-sm">
              Ask ZeFi about this
            </Link>
          </div>
        </>
      ) : null}
    </div>
  )
}
