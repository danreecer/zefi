/**
 * Screenshot harness.
 *
 * Drives a real browser over the running app so visual review and the launch-kit
 * captures come from the same source of truth.
 *
 *   pnpm exec tsx scripts/shoot.ts <name> <path> [--w 1440] [--h 900] [--full]
 *                                  [--sel "#id"] [--scroll 1200] [--wait 1200]
 */
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

import { chromium } from '@playwright/test'

const OUT = join(process.cwd(), '.screens')

function arg(flag: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf(flag)
  return index > -1 ? process.argv[index + 1] : fallback
}

async function main() {
  const [, , name = 'shot', path = '/'] = process.argv
  const width = Number(arg('--w', '1440'))
  const height = Number(arg('--h', '900'))
  const full = process.argv.includes('--full')
  const selector = arg('--sel')
  const scrollTo = arg('--scroll')
  const waitMs = Number(arg('--wait', '1400'))
  const base = process.env.SHOOT_BASE_URL ?? 'http://localhost:3000'

  mkdirSync(OUT, { recursive: true })

  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: Number(arg('--dpr', '2')),
    reducedMotion: 'no-preference',
  })
  const page = await context.newPage()

  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))

  await page.goto(`${base}${path}`, { waitUntil: 'networkidle', timeout: 60_000 })

  if (scrollTo) {
    await page.evaluate((y: number) => {
      document.documentElement.style.scrollBehavior = 'auto'
      window.scrollTo(0, y)
    }, Number(scrollTo))
  }

  await page.waitForTimeout(waitMs)

  if (selector) {
    await page.locator(selector).first().scrollIntoViewIfNeeded()
    await page.waitForTimeout(400)
  }

  const file = join(OUT, `${name}.png`)
  if (selector) {
    await page.locator(selector).first().screenshot({ path: file })
  } else {
    await page.screenshot({ path: file, fullPage: full })
  }

  await browser.close()

  console.log(`→ ${file}`)
  if (errors.length > 0) {
    console.log(`\n⚠ ${errors.length} console error(s):`)
    for (const error of errors.slice(0, 12)) console.log(`  · ${error}`)
    process.exitCode = 2
  } else {
    console.log('✓ no console errors')
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
