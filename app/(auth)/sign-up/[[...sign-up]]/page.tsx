import { SignUp } from '@clerk/nextjs'
import type { Metadata } from 'next'

import { AuthUnavailable } from '@/components/auth/auth-unavailable'
import { publicConfig } from '@/lib/config/public'

export const metadata: Metadata = {
  title: 'Create an account',
  description: 'Create a ZeFi account.',
  robots: { index: false, follow: false },
}

export default function SignUpPage() {
  if (!publicConfig.authConfigured) return <AuthUnavailable context="sign-up flow" />

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <p className="eyebrow justify-center">Open to everyone</p>
        <h1 className="display-lg mt-4 text-ink">Create an account</h1>
        <p className="mt-3 text-[0.9375rem] text-ink-soft">
          Ask. Plan. Execute onchain — with your wallet in control throughout.
        </p>
      </div>
      <SignUp
        appearance={{ elements: { rootBox: 'w-full', card: 'w-full' } }}
        fallbackRedirectUrl="/app"
        signInUrl="/sign-in"
      />
    </div>
  )
}
