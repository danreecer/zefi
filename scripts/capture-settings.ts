/**
 * Recaptures the settings screen alone, without regenerating conversations.
 *
 *   pnpm exec tsx scripts/capture-settings.ts
 */
import { chromium } from '@playwright/test'

const BASE = process.env.CAPTURE_BASE_URL ?? 'http://127.0.0.1:3200'
const CLERK = 'https://api.clerk.com/v1'
const EMAIL = 'demo+clerk_test@zefi.ae'

async function main() {
  const headers = {
    Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
    'content-type': 'application/json',
  }

  const users = (await (
    await fetch(`${CLERK}/users?email_address=${encodeURIComponent(EMAIL)}&limit=1`, { headers })
  ).json()) as Array<{ id: string }>

  const user = users[0]
  if (!user) throw new Error('capture user not found — run capture-product.ts first')

  const ticket = (await (
    await fetch(`${CLERK}/sign_in_tokens`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ user_id: user.id, expires_in_seconds: 600 }),
    })
  ).json()) as { token: string }

  const browser = await chromium.launch()
  const page = await (
    await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 })
  ).newPage()

  await page.goto(`${BASE}/sign-in?__clerk_ticket=${ticket.token}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(6500)
  await page.goto(`${BASE}/app/settings`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)
  await page.screenshot({ path: '.shots/app-10-settings.png' })
  console.log('  → app-10-settings')

  await browser.close()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
