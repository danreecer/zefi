import { expect, test, type Page } from '@playwright/test'

/**
 * Smoke tests.
 *
 * These run against a production build in demo mode: no paid AI provider and no
 * blockchain provider is contacted. They check that every public route renders,
 * that navigation works on both desktop and mobile, that the application area
 * is not publicly readable, and that pages are free of console errors and
 * horizontal overflow.
 */

const PUBLIC_ROUTES = [
  '/',
  '/intelligence',
  '/products',
  '/products/routefold',
  '/how-it-works',
  '/security',
  '/about',
  '/docs',
  '/privacy',
  '/terms',
] as const

/** Collects console errors, ignoring noise a headless browser always emits. */
function watchConsole(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    const text = message.text()
    if (/favicon|ERR_INTERNET_DISCONNECTED|net::ERR_/i.test(text)) return
    errors.push(text)
  })
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
  return errors
}

test.describe('public routes', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route} renders without console errors`, async ({ page }) => {
      const errors = watchConsole(page)
      const response = await page.goto(route)

      expect(response?.status(), `${route} status`).toBeLessThan(400)
      await expect(page.locator('h1').first()).toBeVisible()
      // The footer proves the whole document rendered, not just the shell.
      await expect(
        page.getByRole('contentinfo').getByText('Routefold — A ZeFi company.'),
      ).toBeVisible()
      expect(errors, `${route} console errors`).toEqual([])
    })
  }
})

test.describe('landing page', () => {
  test('shows the hero, the embedded product preview and the closing CTA', async ({ page }) => {
    await page.goto('/')

    await expect(
      page.getByRole('heading', { name: /ask crypto anything/i, level: 1 }),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'Launch ZeFi' }).first()).toBeVisible()

    // The hero holds the real plan interface, not a screenshot.
    await expect(page.getByText('Move $2,000 of USDC from Base to Solana')).toBeVisible()
    await expect(page.getByText('Transaction plan').first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Review plan' })).toBeVisible()
  })

  test('labels illustrative figures as illustrative', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Illustrative').first()).toBeVisible()
  })

  test('states the non-custody guarantee', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByText(/never requests or stores seed phrases or private keys/i).first(),
    ).toBeVisible()
  })

  test('shows the founder', async ({ page }) => {
    await page.goto('/')
    await page.locator('#founders').scrollIntoViewIfNeeded()
    await expect(page.getByRole('link', { name: /@danreecer_/i })).toBeVisible()
  })
})

test.describe('navigation', () => {
  test('desktop nav reaches every primary destination', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop navigation is hidden below the lg breakpoint.')
    await page.goto('/')

    for (const [label, path] of [
      ['Intelligence', '/intelligence'],
      ['Products', '/products'],
      ['Routefold', '/products/routefold'],
      ['Security', '/security'],
      ['Company', '/about'],
    ] as const) {
      await page.goto('/')
      await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: label }).click()
      await expect(page).toHaveURL(new RegExp(`${path}$`))
      await expect(page.locator('h1').first()).toBeVisible()
    }
  })

  test('mobile menu opens, navigates and closes', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile menu only exists below the lg breakpoint.')
    await page.goto('/')

    const toggle = page.getByRole('button', { name: 'Open menu' })
    await expect(toggle).toBeVisible()
    await toggle.click()

    const menu = page.locator('#mobile-nav')
    await expect(menu).toBeVisible()

    await menu.getByRole('link', { name: 'Security' }).click()
    await expect(page).toHaveURL(/\/security$/)
    await expect(page.locator('#mobile-nav')).toHaveCount(0)
  })

  test('the footer links to the legal pages', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('contentinfo').getByRole('link', { name: 'Privacy' }).click()
    await expect(page).toHaveURL(/\/privacy$/)
  })
})

test.describe('Routefold', () => {
  test('has its own identity and is attributed to ZeFi', async ({ page }) => {
    await page.goto('/products/routefold')

    await expect(
      page.getByRole('heading', { name: /model the next chain/i, level: 1 }),
    ).toBeVisible()
    await expect(page.getByText('A ZeFi company').first()).toBeVisible()
    await expect(page.getByText('Multichain Digital Twin').first()).toBeVisible()
    await expect(page.getByText('Chain-fit score').first()).toBeVisible()
    await expect(page.getByText('30-day execution plan').first()).toBeVisible()
  })
})

test.describe('transaction plan', () => {
  test('the example plan opens and shows its provenance', async ({ page }) => {
    await page.goto('/how-it-works#plan')

    const plan = page.locator('article').filter({ hasText: 'Review 250 USDC transfer' }).first()
    await plan.scrollIntoViewIfNeeded()

    await expect(plan.getByText('You asked')).toBeVisible()
    await expect(plan.getByText('ZeFi understood')).toBeVisible()
    await expect(plan.getByText('Sequence of actions')).toBeVisible()
    await expect(plan.getByText('Where these figures came from')).toBeVisible()

    // The honesty properties, asserted rather than assumed.
    await expect(plan.getByText(/has not been executed against chain state/i)).toBeVisible()
    await expect(plan.getByText('Review 250 USDC transfer')).toBeVisible()
    await expect(plan.getByText('Execute instantly')).toHaveCount(0)
  })

  test('a plan ZeFi cannot execute says so', async ({ page }) => {
    await page.goto('/how-it-works#plan')

    const bridgePlan = page
      .locator('article')
      .filter({ hasText: 'Bridge 2,000 USDC from Base to Solana' })
      .first()
    await bridgePlan.scrollIntoViewIfNeeded()

    // The step is named, and the exact variable that would enable it is named too.
    await expect(bridgePlan.getByText(/Bridge routing provider/i).first()).toBeVisible()
    await expect(bridgePlan.getByText(/Add the missing details/).first()).toBeVisible()
  })

  test('the capability matrix distinguishes live from provider-required', async ({ page }) => {
    await page.goto('/how-it-works')
    await expect(page.getByText('Available now').first()).toBeVisible()
    await expect(page.getByText('Provider required').first()).toBeVisible()
    await expect(page.getByText('Not built').first()).toBeVisible()
  })
})

test.describe('authentication', () => {
  test('the sign-in route loads', async ({ page }) => {
    const response = await page.goto('/sign-in')
    expect(response?.status()).toBeLessThan(400)
    await expect(page.locator('h1, [data-localization-key]').first()).toBeVisible()
  })

  test('the sign-up route loads', async ({ page }) => {
    const response = await page.goto('/sign-up')
    expect(response?.status()).toBeLessThan(400)
  })

  /**
   * The property under test is that /app is never readable by an anonymous
   * visitor. With Clerk configured that means a redirect to sign-in; without it
   * the app area renders an explicit "not configured" state. Either is correct;
   * rendering the dashboard is not.
   */
  test('the application area is not publicly readable', async ({ page }) => {
    await page.goto('/app')

    const body = (await page.locator('body').innerText()).toLowerCase()

    // The hard requirement: no dashboard content, ever.
    expect(body, '/app leaked dashboard content to an anonymous visitor').not.toContain(
      'new conversation',
    )
    expect(body).not.toContain('saved transaction plans')
    expect(body).not.toContain('recent conversations')

    // And it must be gated by *something* explicit. An auth-provider error
    // (a Clerk test instance will rate limit under e2e load) still counts as
    // gated — what would not count is the dashboard rendering.
    const gated =
      page.url().includes('sign-in') ||
      body.includes('authentication not configured') ||
      body.includes('sign in') ||
      body.includes('too_many_requests')

    expect(gated, `/app was not gated — body was: ${body.slice(0, 200)}`).toBe(true)
  })
})

test.describe('layout integrity', () => {
  for (const route of ['/', '/products/routefold', '/how-it-works', '/docs'] as const) {
    test(`${route} does not overflow horizontally`, async ({ page }) => {
      await page.goto(route)
      await page.waitForTimeout(600)

      const overflow = await page.evaluate(() => {
        const doc = document.documentElement
        return doc.scrollWidth - doc.clientWidth
      })
      // A couple of pixels of sub-pixel rounding is tolerable; a scrollbar is not.
      expect(overflow, `${route} overflows by ${overflow}px`).toBeLessThanOrEqual(2)
    })
  }

  test('a skip link exists and becomes visible on focus', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Keyboard focus order is a desktop concern here.')
    await page.goto('/')

    const skip = page.getByRole('link', { name: 'Skip to content' })
    await expect(skip).toHaveAttribute('href', '#main')

    // Screen-reader-only until focused, then a real visible control.
    await skip.focus()
    await expect(skip).toBeFocused()
    await expect(skip).toBeVisible()

    await skip.press('Enter')
    await expect(page.locator('#main')).toBeVisible()
  })
})

test.describe('machine-readable surfaces', () => {
  test('robots.txt points at the sitemap and excludes the app', async ({ page }) => {
    const response = await page.goto('/robots.txt')
    const body = (await response?.text()) ?? ''
    expect(body).toContain('Sitemap:')
    expect(body).toContain('/app')
  })

  test('sitemap.xml lists the public routes', async ({ page }) => {
    const response = await page.goto('/sitemap.xml')
    const body = (await response?.text()) ?? ''
    expect(body).toContain('/products/routefold')
    expect(body).toContain('/security')
    expect(body).not.toContain('/app/chat')
  })

  test('the health endpoint reports capabilities without leaking secrets', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.status()).toBe(200)

    const payload = await response.json()
    expect(payload.ok).toBe(true)
    expect(payload.data.service).toBe('zefi')
    expect(payload.data.capabilities).toHaveProperty('execution')

    const raw = JSON.stringify(payload)
    expect(raw).not.toMatch(/sk-|sk_test|sk_live|postgres:\/\//)
  })
})
