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
          // `colorMuted` is a *surface*, not a text colour — Clerk paints the
          // card footer and the UserProfile nav rail with it. Setting it to the
          // ink-muted grey turned both into an opaque brown slab behind the
          // white card. Muted *text* is `colorMutedForeground`.
          colorMuted: '#F8F1E6',
          colorMutedForeground: '#786C60',
          colorBackground: '#FFFFFF',
          colorInput: '#FFFFFF',
          colorDanger: '#A82D15',
          colorSuccess: '#16724F',
          borderRadius: '12px',
          fontFamily: 'var(--font-zefi-sans), Inter, system-ui, sans-serif',
        },
        elements: {
          cardBox: 'shadow-[var(--shadow-panel)] border border-[rgba(23,19,15,0.09)] rounded-[18px]',
          card: 'shadow-none border-0 bg-white',
          footer:
            'bg-white border-t border-[rgba(23,19,15,0.09)] rounded-b-[18px] [&>div]:bg-transparent',
          footerAction: 'bg-transparent',
          footerActionText: 'text-[#786c60]',
          footerActionLink: 'text-ember-700 hover:text-ember-800 font-medium',
          headerTitle: 'font-display tracking-tight text-[#17130f]',
          headerSubtitle: 'text-[#786c60]',
          formButtonPrimary:
            'bg-ink hover:bg-[#241d17] text-ivory normal-case font-medium shadow-none',
          socialButtonsBlockButton:
            'border-[rgba(23,19,15,0.16)] hover:bg-[#fff6ef] normal-case',
          formFieldInput: 'border-[rgba(23,19,15,0.16)] focus:border-ember-600',
          // The embedded UserProfile overflows a narrow column and clips its
          // right-aligned row actions. Keep it fluid and let rows wrap.
          rootBox: 'w-full',
          cardBox_userProfile: 'w-full max-w-none',
          navbar: 'bg-cream border-r border-[rgba(23,19,15,0.09)]',
          logoBox: 'hidden',
        },
      }}
    >
      {children}
    </ClerkProvider>
  )
}
