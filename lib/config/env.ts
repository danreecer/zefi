import 'server-only'

/**
 * Server-side configuration.
 *
 * ZeFi is designed to run in three honest states, and this module is what makes
 * the difference legible everywhere else in the codebase:
 *
 *   • configured   — the credential is present and the real provider is used
 *   • demo         — no credential; deterministic fixtures, always labelled
 *   • unavailable  — a credential is present but the call failed
 *
 * The third state never degrades into the second. A failed model call surfaces
 * as an error; it does not quietly become a fixture.
 */

const clean = (value: string | undefined) => (value && value.trim().length > 0 ? value.trim() : undefined)
const isTrue = (value: string | undefined) => value === 'true' || value === '1'
const num = (value: string | undefined, fallback: number) => {
  const parsed = Number(clean(value))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const databaseUrl = clean(process.env.DATABASE_URL)
const clerkSecretKey = clean(process.env.CLERK_SECRET_KEY)

/* ── AI provider resolution ──────────────────────────────────────────────────
 * OpenAI is ZeFi's default provider. Anthropic ships as a fully-implemented
 * alternative behind the same interface — `AI_PROVIDER=anthropic` switches to it
 * without touching a line of product code. With `AI_PROVIDER` unset, whichever
 * provider has both a key and a model is used, preferring OpenAI.
 * ────────────────────────────────────────────────────────────────────────── */

const openAiKey = clean(process.env.OPENAI_API_KEY)
const openAiModel = clean(process.env.OPENAI_MODEL)
const anthropicKey = clean(process.env.ANTHROPIC_API_KEY)
const anthropicModel = clean(process.env.ANTHROPIC_MODEL)

const openAiReady = Boolean(openAiKey && openAiModel)
const anthropicReady = Boolean(anthropicKey && anthropicModel)

const requested = clean(process.env.AI_PROVIDER)?.toLowerCase()
const resolvedProvider: 'openai' | 'anthropic' | null =
  requested === 'anthropic'
    ? anthropicReady
      ? 'anthropic'
      : null
    : requested === 'openai'
      ? openAiReady
        ? 'openai'
        : null
      : openAiReady
        ? 'openai'
        : anthropicReady
          ? 'anthropic'
          : null

export const serverEnv = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',

  appUrl: clean(process.env.NEXT_PUBLIC_APP_URL) ?? 'https://zefi.ae',

  database: {
    url: databaseUrl,
    configured: Boolean(databaseUrl),
  },

  auth: {
    secretKey: clerkSecretKey,
    configured: Boolean(clerkSecretKey && clean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)),
  },

  ai: {
    provider: resolvedProvider,
    apiKey: resolvedProvider === 'anthropic' ? anthropicKey : openAiKey,
    /**
     * Never hardcoded. If no model is configured the AI layer reports itself as
     * unavailable rather than guessing at an identifier that may not exist.
     */
    model: resolvedProvider === 'anthropic' ? anthropicModel : openAiModel,
    baseUrl: clean(process.env.OPENAI_BASE_URL),
    maxTokens: num(process.env.AI_MAX_TOKENS ?? process.env.ANTHROPIC_MAX_TOKENS, 2048),
    timeoutMs: num(process.env.AI_TIMEOUT_MS ?? process.env.ANTHROPIC_TIMEOUT_MS, 45_000),
    configured: resolvedProvider !== null,
    /** Which providers hold complete credentials, for the settings surface. */
    available: {
      openai: openAiReady,
      anthropic: anthropicReady,
    },
  },

  rpc: {
    ethereum: clean(process.env.RPC_URL_ETHEREUM),
    base: clean(process.env.RPC_URL_BASE),
    arbitrum: clean(process.env.RPC_URL_ARBITRUM),
    optimism: clean(process.env.RPC_URL_OPTIMISM),
    polygon: clean(process.env.RPC_URL_POLYGON),
  },

  providers: {
    simulation: clean(process.env.SIMULATION_PROVIDER),
    simulationApiKey: clean(process.env.SIMULATION_PROVIDER_API_KEY),
    simulationAccount: clean(process.env.SIMULATION_PROVIDER_ACCOUNT),
    simulationProject: clean(process.env.SIMULATION_PROVIDER_PROJECT),
    swap: clean(process.env.SWAP_PROVIDER),
    swapApiKey: clean(process.env.SWAP_PROVIDER_API_KEY),
    bridge: clean(process.env.BRIDGE_PROVIDER),
    bridgeApiKey: clean(process.env.BRIDGE_PROVIDER_API_KEY),
    portfolio: clean(process.env.PORTFOLIO_PROVIDER),
    portfolioApiKey: clean(process.env.PORTFOLIO_PROVIDER_API_KEY),
  },

  flags: {
    executionEnabled: isTrue(process.env.TRANSACTION_EXECUTION_ENABLED),
    demoMode: isTrue(process.env.DEMO_MODE),
  },

  rateLimit: {
    redisUrl: clean(process.env.UPSTASH_REDIS_REST_URL),
    redisToken: clean(process.env.UPSTASH_REDIS_REST_TOKEN),
    aiPerMinute: num(process.env.RATE_LIMIT_AI_PER_MINUTE, 12),
    aiPerDay: num(process.env.RATE_LIMIT_AI_PER_DAY, 250),
  },
} as const

export type ServerEnv = typeof serverEnv

/** A single description of what this deployment can actually do right now. */
export function describeCapabilities() {
  return {
    ai: serverEnv.ai.configured
      ? ('configured' as const)
      : serverEnv.flags.demoMode
        ? ('demo' as const)
        : ('unavailable' as const),
    aiProvider: serverEnv.ai.provider,
    persistence: serverEnv.database.configured ? ('configured' as const) : ('ephemeral' as const),
    auth: serverEnv.auth.configured ? ('configured' as const) : ('unavailable' as const),
    deepSimulation: serverEnv.providers.simulation ? ('configured' as const) : ('local-only' as const),
    swapRouting: serverEnv.providers.swap ? ('configured' as const) : ('provider-required' as const),
    bridgeRouting: serverEnv.providers.bridge ? ('configured' as const) : ('provider-required' as const),
    portfolioPricing: serverEnv.providers.portfolio
      ? ('configured' as const)
      : ('provider-required' as const),
    execution: serverEnv.flags.executionEnabled
      ? ('native-and-erc20-transfers' as const)
      : ('disabled' as const),
    demoMode: serverEnv.flags.demoMode,
  }
}

export type Capabilities = ReturnType<typeof describeCapabilities>
