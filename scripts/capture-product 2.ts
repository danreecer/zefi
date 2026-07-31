/**
 * Product screenshot capture.
 *
 * Signs in with a Clerk test user, generates genuine assistant conversations
 * through the real pipeline, then captures the signed-in product. Nothing here
 * is mocked: the replies come from the configured model, the plans come from the
 * deterministic planner, and the rows are read back out of Postgres.
 *
 *   pnpm exec tsx scripts/capture-product.ts
 *
 * Requires a running server with Clerk, an AI provider and DATABASE_URL
 * configured. See scripts/local-postgres.ts for a zero-install database.
 */
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

import { clerkSetup, setupClerkTestingToken } from '@clerk/testing/playwright'
import { chromium, type Page } from '@playwright/test'

const BASE = process.env.CAPTURE_BASE_URL ?? 'http://127.0.0.1:3200'
const OUT = join(process.cwd(), '.shots')

/** Clerk test mode accepts any `+clerk_test` address without a real mailbox. */
const EMAIL = 'demo+clerk_test@zefi.ae'

const PROMPTS = [
  'How much stablecoin exposure do I have, and what should I be thinking about?',
  'Move $2,000 of USDC from Base to Solana using the safest route.',
  'What is the difference between a burn-and-mint bridge and a liquidity-pool bridge?',
]

/**
 * Authenticate without touching the sign-in UI.
 *
 * The instance has Cloudflare Turnstile on sign-up and Google OAuth alongside
 * email codes, both of which make UI automation fragile and neither of which
 * should be driven by a script. Clerk's Backend API provides the supported
 * alternative: create (or find) the user with the instance's own secret key,
 * mint a short-lived sign-in token, and hand it to the app as a ticket. Clerk
 * establishes the session itself.
 */
const CLERK_API = 'https://api.clerk.com/v1'

async function clerk<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${CLERK_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  const body = await response.json()
  if (!response.ok) {
    throw new Error(`Clerk ${path} → ${response.status}: ${JSON.stringify(body).slice(0, 300)}`)
  }
  return body as T
}

async function ensureUser(): Promise<string> {
  const existing = await clerk<Array<{ id: string }>>(
    `/users?email_address=${encodeURIComponent(EMAIL)}&limit=1`,
  )
  if (existing.length > 0 && existing[0]) {
    console.log(`  reusing user ${existing[0].id}`)
    return existing[0].id
  }

  const created = await clerk<{ id: string }>('/users', {
    method: 'POST',
    body: JSON.stringify({
      email_address: [EMAIL],
      first_name: 'Dan',
      last_name: 'Reecer',
      skip_password_requirement: true,
    }),
  })
  console.log(`  created user ${created.id}`)
  return created.id
}

async function signIn(page: Page): Promise<boolean> {
  const userId = await ensureUser()

  const ticket = await clerk<{ token: string }>('/sign_in_tokens', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, expires_in_seconds: 600 }),
  })

  await page.goto(`${BASE}/sign-in?__clerk_ticket=${ticket.token}`, {
    waitUntil: 'domcontentloaded',
  })
  await page.waitForTimeout(6000)

  await page.goto(`${BASE}/app`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(3000)

  const ok = !page.url().includes('sign-in') && !page.url().includes('sign-up')
  if (!ok) await page.screenshot({ path: join(OUT, '_auth-debug.png') })
  return ok
}

async function main() {
  mkdirSync(OUT, { recursive: true })

  // Resolves the instance's Frontend API from the publishable/secret key pair.
  await clerkSetup({ publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY })

  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 2,
  })
  const page = await context.newPage()

  // Must run before navigating to any Clerk-rendered page.
  await setupClerkTestingToken({ page })

  const signedIn = await signIn(page)
  console.log(signedIn ? `✓ signed in — ${page.url()}` : `✗ not signed in — ${page.url()}`)
  if (!signedIn) {
    await page.screenshot({ path: join(OUT, '_auth-debug.png') })
    await browser.close()
    process.exit(1)
  }

  // ── Generate genuine content through the real pipeline ────────────────────
  for (const [index, prompt] of PROMPTS.entries()) {
    const result = await page.evaluate(async (message) => {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message, conversationId: null, wallet: null }),
      })
      const payload = await response.json()
      return payload.ok
        ? { ok: true, id: payload.data.conversationId, intent: payload.data.intent.intentType }
        : { ok: false, error: payload.error?.message }
    }, prompt)
    console.log(`  ${index + 1}. ${result.ok ? `${result.intent} → ${result.id}` : `FAILED: ${result.error}`}`)
  }

  await page.waitForTimeout(1500)

  // ── Capture ───────────────────────────────────────────────────────────────
  const shots: Array<[string, string, number?]> = [
    ['app-01-dashboard', '/app'],
    ['app-02-assistant', '/app/chat'],
    ['app-03-plans', '/app/plans'],
    ['app-04-wallet', '/app/wallet'],
    ['app-05-history', '/app/history'],
    ['app-06-routefold', '/app/routefold'],
    ['app-07-settings', '/app/settings'],
  ]

  for (const [name, path] of shots) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2200)
    await page.screenshot({ path: join(OUT, `${name}.png`) })
    console.log(`  → ${name}`)
  }

  // The conversation thread, and a saved plan in full.
  await page.goto(`${BASE}/app/chat`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const firstConversation = page.locator('aside button').filter({ hasText: /\w/ }).first()
  if (await firstConversation.isVisible().catch(() => false)) {
    await firstConversation.click()
    await page.waitForTimeout(2800)
    await page.screenshot({ path: join(OUT, 'app-08-conversation.png') })
    console.log('  → app-08-conversation')
  }

  await page.goto(`${BASE}/app/plans`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const firstPlan = page.locator('a[href^="/app/plans/"]').first()
  if (await firstPlan.isVisible().catch(() => false)) {
    await firstPlan.click()
    await page.waitForTimeout(2800)
    await page.screenshot({ path: join(OUT, 'app-09-plan-detail.png'), fullPage: true })
    console.log('  → app-09-plan-detail')
  }

  await browser.close()
  console.log('done')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
