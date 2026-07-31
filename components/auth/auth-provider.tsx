import { ClerkProvider } from '@clerk/nextjs'
import type { ReactNode } from 'react'

import { publicConfig } from '@/lib/config/public'

/**
 * Wraps the tree in Clerk only when Clerk is actually configured.
 *
 * `ClerkProvider` throws without a publishable key, which would make a
 * credential-free checkout of this repository fail to render at all. Rather
 * than that, the app area detects the missing configuration and explains it.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  if (!publicConfig.authConfigured) return <>{children}</>

  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#ED4F08',
          colorForeground: '#17130F',
          colorMuted: '#786C60',
          colorBackground: '#FFFFFF',
          colorInput: '#FFFFFF',
          colorDanger: '#A82D15',
          colorSuccess: '#16724F',
          borderRadius: '12px',
          fontFamily: 'var(--font-zefi-sans), Inter, system-ui, sans-serif',
        },
        elements: {
          card: 'shadow-none border border-[rgba(23,19,15,0.09)] bg-white/85 backdrop-blur-xl',
          headerTitle: 'font-display tracking-tight',
          formButtonPrimary:
            'bg-ink hover:bg-[#241d17] text-ivory normal-case font-medium shadow-none',
          footerActionLink: 'text-ember-700 hover:text-ember-800',
          logoBox: 'hidden',
        },
      }}
    >
      {children}
    </ClerkProvider>
  )
}
