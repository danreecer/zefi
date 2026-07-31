'use client'

import { RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'

import { ZefiMark } from '@/components/brand/zefi-mark'

/**
 * Route error boundary.
 *
 * Deliberately states that nothing was submitted onchain — the first question a
 * user has when an interface fails mid-transaction, and one they should not have
 * to guess at.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[zefi] route error', error)
  }, [error])

  return (
    <div className="ambient-field-soft flex min-h-dvh items-center justify-center px-4 py-16">
      <div className="panel-solid max-w-lg p-8 text-center">
        <ZefiMark className="mx-auto h-8 w-8" />
        <h1 className="display-md mt-6 text-ink">Something failed on ZeFi’s side</h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">
          This page could not render. Nothing was submitted onchain and no transaction was signed.
        </p>
        {error.digest ? (
          <p className="num mt-4 text-[0.6875rem] text-ink-muted">Reference · {error.digest}</p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          <button type="button" onClick={reset} className="btn btn-primary btn-sm">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Try again
          </button>
          <Link href="/" className="btn btn-ghost btn-sm">
            Back to zefi.ae
          </Link>
        </div>
      </div>
    </div>
  )
}
