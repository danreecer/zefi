import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Route protection.
 *
 * This is Next.js 16's `proxy.ts` convention, which replaces `middleware.ts`.
 * The distinction matters here: middleware compiled to the Edge runtime, and
 * Clerk's server SDK reaches for Node built-ins (`#crypto`, `#safe-node-apis`),
 * so an Edge build fails at deploy time with "referencing unsupported modules".
 * Proxy always runs on Node.js, so those imports resolve.
 *
 * The matcher is deliberately narrow: middleware runs **only** on the
 * application area and the mutating API routes. Two consequences, both
 * intentional:
 *
 *  1. The marketing site, `robots.txt` and `sitemap.xml` do not depend on the
 *     auth provider at all. An outage or a rate limit at Clerk cannot take down
 *     zefi.ae, and a crawler never triggers an auth call.
 *  2. Clerk is not invoked once per public page view, which is where the load
 *     would otherwise come from.
 *
 * Everything that calls `auth()` — `lib/auth/session.ts`, and therefore every
 * `/app` page and protected API route — is inside the matcher below. Nothing
 * outside it uses Clerk on the server.
 *
 * When Clerk is not configured the middleware degrades to a pass-through and
 * the /app layout renders an explicit "authentication is not configured" state,
 * so a credential-free checkout of this repository stays runnable.
 */

const authConfigured = Boolean(
  process.env.CLERK_SECRET_KEY?.trim() && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim(),
)

const protectedMiddleware = clerkMiddleware(async (auth, request) => {
  // Every path reaching this middleware is protected by definition — the
  // matcher already excluded everything else.
  //
  // Page requests name their destination explicitly. Left to its default,
  // `protect()` decides between a redirect and a 404 by inspecting the request,
  // and it chooses 404 whenever it cannot resolve the visitor's state — which is
  // what a signed-out browser hitting /app looks like when the auth provider's
  // handshake has not run. A 404 on a route that plainly exists is a lie to the
  // user and to crawlers; sending them to sign-in is the honest answer.
  if (request.nextUrl.pathname.startsWith('/api/')) {
    await auth.protect()
    return
  }

  await auth.protect({
    unauthenticatedUrl: new URL('/sign-in', request.url).toString(),
  })
})

export default function proxy(
  request: NextRequest,
  event: Parameters<typeof protectedMiddleware>[1],
) {
  if (!authConfigured) return NextResponse.next()
  return protectedMiddleware(request, event)
}

export const config = {
  matcher: [
    '/app',
    '/app/:path*',
    '/api/chat/:path*',
    '/api/conversations/:path*',
    '/api/plans/:path*',
    '/api/wallet/:path*',
    '/api/transactions/:path*',
  ],
}
