import type { NextConfig } from 'next'

const isProd = process.env.NODE_ENV === 'production'

/**
 * Content Security Policy.
 *
 * Notes on the deliberate trade-offs (also documented in SECURITY.md):
 * - `script-src` allows `'unsafe-inline'` because Next.js emits inline bootstrap
 *   scripts for every statically rendered route. Moving to a nonce-based policy
 *   requires forcing dynamic rendering on the marketing site, which we do not want.
 *   `object-src 'none'`, `base-uri 'self'` and `frame-ancestors 'none'` are the
 *   high-value directives and are enforced strictly.
 * - `connect-src` allows `https:` because users configure their own JSON-RPC
 *   endpoints and wallet providers dial arbitrary relays from the browser.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"} https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com`,
  "worker-src 'self' blob:",
  "connect-src 'self' https: wss:",
  "frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com https://verify.walletconnect.com https://verify.walletconnect.org",
  // `upgrade-insecure-requests` is deliberately absent. On any plain-HTTP
  // origin it rewrites same-origin navigations and prefetches to https:// and
  // they all fail — Chromium exempts localhost, WebKit does not, so it breaks
  // Safari against a non-TLS preview. HSTS (set below, in production) is the
  // stronger guarantee and does not have this failure mode.
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=()',
  },
  ...(isProd
    ? [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
      ]
    : []),
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The floating dev badge sits over the hero and pollutes screenshots.
  devIndicators: false,
  // Lint runs as its own CI step (`pnpm lint`) so build failures stay
  // attributable to real compile errors.
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', 'recharts'],
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        source: '/launch-kit/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600' }],
      },
    ]
  },
}

export default nextConfig
