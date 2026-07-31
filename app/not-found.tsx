import Link from 'next/link'

import { ZefiMark } from '@/components/brand/zefi-mark'

export default function NotFound() {
  return (
    <div className="ambient-field-soft flex min-h-dvh items-center justify-center px-4 py-16">
      <div className="panel-solid max-w-md p-8 text-center">
        <ZefiMark className="mx-auto h-8 w-8" />
        <p className="num mt-6 text-[0.75rem] tracking-[0.2em] text-ember-700">404</p>
        <h1 className="display-md mt-2 text-ink">No route to that page</h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">
          ZeFi could not resolve this address. It may have moved, or it may never have existed.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          <Link href="/" className="btn btn-primary btn-sm">
            Back to zefi.ae
          </Link>
          <Link href="/app" className="btn btn-ghost btn-sm">
            Launch ZeFi
          </Link>
        </div>
      </div>
    </div>
  )
}
