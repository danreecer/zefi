'use client'

import { useEffect } from 'react'

/**
 * Root error boundary. Replaces the whole document, so it carries its own
 * `<html>` and inline styles — the stylesheet may be exactly what failed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[zefi] global error', error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          background: '#FDFAF4',
          color: '#17130F',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
          padding: '2rem',
        }}
      >
        <main style={{ maxWidth: '28rem', textAlign: 'center' }}>
          <svg viewBox="0 0 48 48" width="34" height="34" fill="none" aria-hidden="true">
            <g stroke="#17130F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11H39" />
              <path d="M39 11C34 14.5 29 19.5 24 24C19 28.5 14 33.5 9 37" />
              <path d="M9 37H39" />
            </g>
            <circle cx="24" cy="24" r="2.7" fill="#ED4F08" />
          </svg>
          <h1 style={{ fontSize: '1.35rem', marginTop: '1.5rem', fontWeight: 500 }}>
            ZeFi could not start
          </h1>
          <p style={{ marginTop: '0.75rem', lineHeight: 1.6, color: '#3D352D', fontSize: '0.9375rem' }}>
            The application failed before it could render. Nothing was submitted onchain and no
            transaction was signed.
          </p>
          {error.digest ? (
            <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#786C60' }}>
              Reference · {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: '1.5rem',
              padding: '0.7rem 1.3rem',
              borderRadius: '999px',
              border: 'none',
              background: '#17130F',
              color: '#FDFAF4',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
