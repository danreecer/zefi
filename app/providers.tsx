'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'framer-motion'
import { useState, type ReactNode } from 'react'
import { Toaster } from 'sonner'

/**
 * Providers every route needs.
 *
 * Deliberately does **not** include wallet or authentication providers. Those
 * mount only where they are used — `app/app/layout.tsx` and the auth routes —
 * so the public marketing site ships no wallet SDK, opens no relay connection,
 * and does not depend on the auth provider being reachable.
 */
export function BaseProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      {/* `reducedMotion="user"` makes every Framer animation in the product
          honour the OS setting without each component opting in. */}
      <MotionConfig reducedMotion="user">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(23,19,15,0.09)',
              color: '#17130F',
              borderRadius: '14px',
              fontSize: '0.875rem',
            },
          }}
        />
      </MotionConfig>
    </QueryClientProvider>
  )
}
