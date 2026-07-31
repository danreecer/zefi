import { beforeAll, vi } from 'vitest'

/**
 * Global test setup.
 *
 * Paid providers (Anthropic) and blockchain RPC endpoints are never contacted
 * from the test suite. Anything that would reach the network is either mocked
 * at the module boundary inside the individual test file, or short-circuited by
 * the absence of credentials below.
 */
beforeAll(() => {
  vi.stubEnv('ANTHROPIC_API_KEY', '')
  vi.stubEnv('ANTHROPIC_MODEL', '')
  vi.stubEnv('DEMO_MODE', 'true')
  vi.stubEnv('TRANSACTION_EXECUTION_ENABLED', 'false')
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')
})
