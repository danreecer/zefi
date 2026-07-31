import { SignIn } from '@clerk/nextjs'
import type { Metadata } from 'next'

import { AuthUnavailable } from '@/components/auth/auth-unavailable'
import { publicConfig } from '@/lib/config/public'

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to ZeFi.',
  robots: { index: false, follow: false },
}

export default function SignInPage() {
  if (!publicConfig.authConfigured) return <AuthUnavailable context="sign-in flow" />

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <p className="eyebrow justify-center">Welcome back</p>
        <h1 className="display-lg mt-4 text-ink">Sign in</h1>
        <p className="mt-3 text-[0.9375rem] text-ink-soft">
          Continue to your conversations, plans and wallet context.
        </p>
      </div>
      <SignIn
        appearance={{ elements: { rootBox: 'w-full', card: 'w-full' } }}
        fallbackRedirectUrl="/app"
        signUpUrl="/sign-up"
      />
    </div>
  )
}
