'use client'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, ChevronDown, Copy, ExternalLink, LogOut, Wallet } from 'lucide-react'
import { useEffect, useSyncExternalStore } from 'react'
import { formatUnits } from 'viem'
import { toast } from 'sonner'
import { useAccount, useBalance, useChainId, useConnect, useDisconnect, useSwitchChain } from 'wagmi'

import { explorerAddressUrl, getChainById, EXECUTABLE_CHAIN_KEYS, CHAINS } from '@/lib/chains/registry'
import { publicConfig } from '@/lib/config/public'
import { cn, formatTokenAmount, truncateAddress } from '@/lib/utils'

/**
 * Wallet connection.
 *
 * Connect, disconnect, switch account, switch chain, copy address, and a clear
 * unsupported-network state. ZeFi asks for none of these permissions itself —
 * everything here is the wallet's own consent flow.
 */
export function WalletButton({ compact = false }: { compact?: boolean }) {
  const { address, isConnected, connector } = useAccount()
  const chainId = useChainId()
  const { connectors, connect, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const { data: balance } = useBalance({ address, query: { enabled: Boolean(address) } })

  // Wallet state is client-only; rendering it during SSR guarantees a mismatch.
  // `useSyncExternalStore` gives a false server snapshot and a true client one
  // without a setState-in-effect round trip.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false)

  const chain = getChainById(chainId)
  const unsupported = isConnected && !chain

  // Record the connection so the dashboard can show recent wallets.
  useEffect(() => {
    if (!isConnected || !address || !chainId) return
    void fetch('/api/wallet/connection', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ address, chainId, label: connector?.name ?? null }),
    }).catch(() => {
      // A failed bookkeeping write must never interrupt a wallet session.
    })
  }, [isConnected, address, chainId, connector?.name])

  if (!mounted) {
    return (
      <span className="btn btn-ghost btn-sm pointer-events-none opacity-0" aria-hidden="true">
        Connect wallet
      </span>
    )
  }

  if (!isConnected) {
    return (
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button type="button" className="btn btn-ghost btn-sm gap-2" disabled={isPending}>
            <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
            {isPending ? 'Connecting…' : 'Connect wallet'}
          </button>
        </DropdownMenu.Trigger>
        <Menu>
          <p className="label-tech-sm px-3 pt-2 pb-1 text-ink-muted">Choose a wallet</p>
          {connectors.map((item) => (
            <DropdownMenu.Item
              key={item.uid}
              onSelect={() => connect({ connector: item })}
              className="flex cursor-pointer items-center justify-between gap-6 rounded-lg px-3 py-2 text-[0.875rem] outline-none select-none data-highlighted:bg-ember-50"
            >
              {item.name}
            </DropdownMenu.Item>
          ))}
          {!publicConfig.walletConnectProjectId ? (
            <p className="mt-1 border-t border-line px-3 pt-2 pb-1 text-[0.6875rem] leading-relaxed text-ink-muted">
              WalletConnect is unavailable — no project id is configured for this deployment.
            </p>
          ) : null}
          <p className="border-t border-line px-3 pt-2 pb-1 text-[0.6875rem] leading-relaxed text-ink-muted">
            ZeFi never asks for a seed phrase or a private key.
          </p>
        </Menu>
      </DropdownMenu.Root>
    )
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={cn(
            'btn btn-sm gap-2',
            unsupported ? 'border border-critical/30 bg-critical-soft text-critical' : 'btn-ghost',
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              unsupported ? 'bg-critical' : 'bg-positive',
            )}
          />
          {unsupported ? 'Unsupported network' : truncateAddress(address ?? '', 4, 4)}
          {!compact ? <ChevronDown className="h-3 w-3 opacity-60" aria-hidden="true" /> : null}
        </button>
      </DropdownMenu.Trigger>

      <Menu>
        <div className="border-b border-line px-3 pt-2 pb-3">
          <p className="label-tech-sm text-ink-muted">Connected</p>
          <p className="num mt-1 text-[0.8125rem] break-all text-ink">{address}</p>
          <div className="mt-2 flex items-center gap-3">
            <span className="num text-[0.75rem] text-ink-soft">
              {balance ? `${formatTokenAmount(formatUnits(balance.value, balance.decimals))} ${balance.symbol}` : '—'}
            </span>
            <span className="text-[0.75rem] text-ink-muted">{connector?.name}</span>
          </div>
        </div>

        {unsupported ? (
          <p className="px-3 py-2 text-[0.75rem] leading-relaxed text-critical">
            Chain id {chainId} is not in ZeFi’s registry. Switch to a supported network for wallet-aware
            answers and plans.
          </p>
        ) : null}

        <p className="label-tech-sm px-3 pt-2 pb-1 text-ink-muted">Network</p>
        {EXECUTABLE_CHAIN_KEYS.map((key) => {
          const item = CHAINS[key]
          if (!item?.chainId) return null
          const active = item.chainId === chainId
          return (
            <DropdownMenu.Item
              key={key}
              onSelect={() => {
                if (!active && item.chainId) switchChain({ chainId: item.chainId })
              }}
              disabled={isSwitching}
              className="flex cursor-pointer items-center justify-between gap-6 rounded-lg px-3 py-1.5 text-[0.875rem] outline-none select-none data-highlighted:bg-ember-50"
            >
              {item.name}
              {active ? <Check className="h-3.5 w-3.5 text-ember-600" aria-hidden="true" /> : null}
            </DropdownMenu.Item>
          )
        })}

        <div className="mt-1 border-t border-line pt-1">
          <DropdownMenu.Item
            onSelect={() => {
              if (!address) return
              void navigator.clipboard
                .writeText(address)
                .then(() => toast.success('Address copied'))
                .catch(() => toast.error('Could not copy address'))
            }}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[0.875rem] outline-none select-none data-highlighted:bg-ember-50"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            Copy address
          </DropdownMenu.Item>

          {chain && address ? (
            <DropdownMenu.Item asChild>
              <a
                href={explorerAddressUrl(chain.key, address) ?? '#'}
                target="_blank"
                rel="noreferrer noopener"
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[0.875rem] outline-none select-none data-highlighted:bg-ember-50"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                View on {chain.shortName} explorer
              </a>
            </DropdownMenu.Item>
          ) : null}

          <DropdownMenu.Item
            onSelect={() => disconnect()}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[0.875rem] text-critical outline-none select-none data-highlighted:bg-critical-soft"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            Disconnect
          </DropdownMenu.Item>
        </div>
      </Menu>
    </DropdownMenu.Root>
  )
}

/** A store that never emits: the snapshot difference alone drives the swap. */
function subscribeNever() {
  return () => {}
}

function Menu({ children }: { children: React.ReactNode }) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align="end"
        sideOffset={8}
        className="panel z-50 w-[19rem] p-1.5 shadow-[var(--shadow-raised)]"
      >
        {children}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  )
}
