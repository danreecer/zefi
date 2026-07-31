import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** `0x1234…abcd` — the canonical way ZeFi renders an address in the UI. */
export function truncateAddress(address: string, lead = 6, tail = 4): string {
  if (address.length <= lead + tail + 1) return address
  return `${address.slice(0, lead)}…${address.slice(-tail)}`
}

export function truncateMiddle(value: string, max = 28): string {
  if (value.length <= max) return value
  const half = Math.floor((max - 1) / 2)
  return `${value.slice(0, half)}…${value.slice(-half)}`
}

/**
 * Formats a token amount for display. Deliberately conservative: never rounds a
 * value up, and keeps enough precision that a user can reconcile it against
 * their wallet.
 */
export function formatTokenAmount(value: string | number, decimals = 6): string {
  const n = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(n)) return '—'
  if (n === 0) return '0'
  if (Math.abs(n) < 0.000001) return '<0.000001'
  const maximumFractionDigits = Math.abs(n) >= 1000 ? 2 : Math.abs(n) >= 1 ? 4 : decimals
  return n.toLocaleString('en-US', { maximumFractionDigits })
}

export function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  })
}

export function formatPercent(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return `${value.toFixed(digits)}%`
}

/** Relative time in the terse register ZeFi uses for data freshness. */
export function formatRelativeTime(date: Date | string | number): string {
  const then = new Date(date).getTime()
  if (!Number.isFinite(then)) return '—'
  const diff = Date.now() - then
  const abs = Math.abs(diff)
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour

  if (abs < 45_000) return 'just now'
  if (abs < hour) return `${Math.round(abs / minute)}m ago`
  if (abs < day) return `${Math.round(abs / hour)}h ago`
  if (abs < 7 * day) return `${Math.round(abs / day)}d ago`
  return new Date(then).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateTime(date: Date | string | number): string {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—'
  if (seconds < 90) return `~${Math.round(seconds)}s`
  const minutes = seconds / 60
  if (minutes < 90) return `~${Math.round(minutes)} min`
  return `~${(minutes / 60).toFixed(1)} h`
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Stable, dependency-free id for client-side optimistic records. */
export function createId(prefix = 'id'): string {
  const rand =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 16)
      : Math.random().toString(36).slice(2, 18)
  return `${prefix}_${rand}`
}
