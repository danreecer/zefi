import Link from 'next/link'

/**
 * Shown when Clerk has no credentials configured.
 *
 * A credential-free checkout of this repository still renders the whole
 * marketing site and the design system. Rather than crashing or faking a signed-in
 * user, the application area explains precisely what is missing.
 */
export function AuthUnavailable({ context = 'application' }: { context?: string }) {
  return (
    <div className="panel-solid mx-auto max-w-lg p-8 text-center">
      <span className="chip chip-caution">Authentication not configured</span>
      <h1 className="display-md mt-5 text-ink">The {context} needs credentials</h1>
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">
        This deployment has no Clerk keys, so ZeFi cannot establish a session. Set{' '}
        <span className="num text-ink">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</span> and{' '}
        <span className="num text-ink">CLERK_SECRET_KEY</span>, then restart.
      </p>
      <p className="mt-4 text-[0.8125rem] leading-relaxed text-ink-muted">
        ZeFi will not invent a session to get past this screen. Everything that does not require one —
        the assistant’s deterministic layer, the plan interface, the chain registry — remains available
        on the public site.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        <Link href="/" className="btn btn-primary btn-sm">
          Back to zefi.ae
        </Link>
        <Link href="/docs#environment" className="btn btn-ghost btn-sm">
          Configuration reference
        </Link>
      </div>
    </div>
  )
}
