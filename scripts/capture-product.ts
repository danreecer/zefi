/**
 * Product screenshot capture.
 *
 * Signs in through Clerk's Backend API, then drives the real interface: types
 * into the composer, waits for the model, and captures what a user would see.
 * Nothing is mocked — replies come from the configured provider, plans come
 * from the deterministic planner, and the risk findings come from the rules
 * engine.
 *
 *   pnpm exec tsx scripts/capture-product.ts
 *
 * Requires a running server with Clerk and an AI provider configured. A
 * database is optional: without one the app is honest about not persisting, and
 * the assistant still works because a live conversation is client state.
 */
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

import { chromium, type Page } from '@playwright/test'

const BASE = process.env.CAPTURE_BASE_URL ?? 'http://127.0.0.1:3200'
const OUT = join(process.cwd(), '.shots')

/** Clerk test mode accepts any `+clerk_test` address without a real mailbox. */
const EMAIL = 'demo+clerk_test@zefi.ae'

/**
 * Authenticate without touching the sign-in UI.
 *
 * The instance has Cloudflare Turnstile on sign-up and Google OAuth alongside
 * email codes — neither of which a script should drive. Clerk's Backend API is
 * the supported alternative: find or create the user with the instance's own
 * secret key, mint a short-lived sign-in token, and hand it to the app as a
 * ticket. Clerk establishes the session itself.
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
  const found = await clerk<Array<{ id: string }>>(
    `/users?email_address=${encodeURIComponent(EMAIL)}&limit=1`,
  )
  if (found[0]) return found[0].id

  const created = await clerk<{ id: string }>('/users', {
    method: 'POST',
    body: JSON.stringify({
      email_address: [EMAIL],
      first_name: 'Dan',
      skip_password_requirement: true,
    }),
  })
  return created.id
}

async function signIn(page: Page): Promise<boolean> {
  const userId = await ensureUser()
  const ticket = await clerk<{ token: string }>('/sign_in_tokens', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, expires_in_seconds: 900 }),
  })

  await page.goto(`${BASE}/sign-in?__clerk_ticket=${ticket.token}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(6500)
  await page.goto(`${BASE}/app`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(3000)

  return !page.url().includes('sign-in') && !page.url().includes('sign-up')
}

/** Types a prompt into the composer and waits for the turn to resolve. */
async function ask(page: Page, prompt: string): Promise<void> {
  const composer = page.locator('#chat-input')
  await composer.click()
  await composer.fill(prompt)
  await page.keyboard.press('Enter')

  const thinking = page.getByText(/Interpreting, resolving against the registry/i)
  await thinking.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {})
  await thinking.waitFor({ state: 'hidden', timeout: 120_000 }).catch(() => {})
  await page.waitForTimeout(2000)
}

async function main() {
  mkdirSync(OUT, { recursive: true })

  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 2,
  })
  const page = await context.newPage()

  if (!(await signIn(page))) {
    await page.screenshot({ path: join(OUT, '_auth-debug.png') })
    console.error(`✗ not signed in — ${page.url()}`)
    await browser.close()
    process.exit(1)
  }
  console.log('✓ signed in')

  const shot = async (name: string, full = false) => {
    await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: full })
    console.log(`  → ${name}`)
  }

  // ── Build a realistic history: distinct conversations, real answers ───────
  await page.goto(`${BASE}/app/chat`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  await shot('app-02-assistant-empty')

  const BACKGROUND = [
    'What is the difference between a burn-and-mint bridge and a liquidity-pool bridge?',
    'Send 250 USDC to 0x4E8F2A1b9C7D3e5f6A0B1C2d3E4f5a6B7c8D9E0F on Base',
  ]
  for (const prompt of BACKGROUND) {
    console.log('  seeding conversation (live model call)…')
    await page.goto(`${BASE}/app/chat`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await ask(page, prompt)
  }

  // The headline conversation, asked last so it sits at the top of the list.
  await page.goto(`${BASE}/app/chat`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  console.log('  asking the headline question (live model call)…')
  await ask(page, 'Move $2,000 of USDC from Base to Solana using the safest route.')

  // Frame on the exchange itself: the question, the reply, the top of the plan.
  await page.getByText('Transaction plan').first().scrollIntoViewIfNeeded()
  await page.mouse.wheel(0, -260)
  await page.waitForTimeout(900)
  await shot('app-03-assistant-plan')

  // And on the part that makes the product what it is: the risk register.
  await page.getByText('Risk review').first().scrollIntoViewIfNeeded()
  await page.mouse.wheel(0, -140)
  await page.waitForTimeout(900)
  await shot('app-04-assistant-risk')

  await ask(page, 'What would the approval step authorise, and how would I revoke it later?')
  await page.waitForTimeout(800)
  await shot('app-05-assistant-followup')

  // ── The rest of the product ───────────────────────────────────────────────
  for (const [name, path] of [
    ['app-01-dashboard', '/app'],
    ['app-06-wallet', '/app/wallet'],
    ['app-07-plans', '/app/plans'],
    ['app-08-history', '/app/history'],
    ['app-09-routefold', '/app/routefold'],
    ['app-10-settings', '/app/settings'],
  ] as const) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2200)
    await shot(name)
  }

  // ── A saved plan, in full ─────────────────────────────────────────────────
  await page.goto(`${BASE}/app/plans`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1600)
  const firstPlan = page.locator('a[href^="/app/plans/"]').first()
  if (await firstPlan.isVisible().catch(() => false)) {
    await firstPlan.click()
    await page.waitForTimeout(3000)
    await shot('app-11-plan-detail')
    await shot('app-12-plan-detail-full', true)
  }

  // ── Signed out ────────────────────────────────────────────────────────────
  await context.clearCookies()
  await page.goto(`${BASE}/sign-in`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(3500)
  await shot('app-13-sign-in')

  await browser.close()
  console.log('done')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
