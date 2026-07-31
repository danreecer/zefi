import type { Metadata } from 'next'
import Link from 'next/link'

import { PageHero } from '@/components/marketing/page-hero'
import { SectionHeader } from '@/components/marketing/section-header'
import { CHAINS, CHAIN_KEYS, KNOWN_SYMBOLS } from '@/lib/chains/registry'
import { INTENT_TYPES } from '@/lib/intent/schema'
import { PLAN_STATUSES, PLAN_STATUS_LABELS } from '@/lib/planner/types'

export const metadata: Metadata = {
  title: 'Documentation',
  description:
    'Supported chains and assets, intent categories, plan statuses, environment configuration, and how to run ZeFi.',
  alternates: { canonical: '/docs' },
}

const ENV_GROUPS = [
  {
    title: 'Core',
    vars: [
      ['DATABASE_URL', 'PostgreSQL connection string. Omit to run without persistence.'],
      ['NEXT_PUBLIC_APP_URL', 'Canonical public URL. Defaults to https://zefi.ae.'],
    ],
  },
  {
    title: 'Authentication',
    vars: [
      ['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'Clerk publishable key.'],
      ['CLERK_SECRET_KEY', 'Clerk secret key. Server-only.'],
      ['NEXT_PUBLIC_CLERK_SIGN_IN_URL', 'Defaults to /sign-in.'],
      ['NEXT_PUBLIC_CLERK_SIGN_UP_URL', 'Defaults to /sign-up.'],
    ],
  },
  {
    title: 'AI',
    vars: [
      ['AI_PROVIDER', 'openai (default) or anthropic. Unset auto-selects whichever is fully configured.'],
      ['OPENAI_API_KEY', 'OpenAI API key.'],
      ['OPENAI_MODEL', 'Model identifier. Never hardcoded in source — set what your key can access.'],
      ['OPENAI_BASE_URL', 'Optional. For an Azure or OpenAI-compatible gateway.'],
      ['ANTHROPIC_API_KEY', 'Alternative provider key.'],
      ['ANTHROPIC_MODEL', 'Alternative provider model identifier.'],
      ['AI_MAX_TOKENS', 'Optional. Defaults to 2048.'],
      ['AI_TIMEOUT_MS', 'Optional. Defaults to 45000.'],
    ],
  },
  {
    title: 'Wallet & RPC',
    vars: [
      ['NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID', 'Enables the WalletConnect connector when present.'],
      ['RPC_URL_ETHEREUM', 'Server-side endpoint. Public fallback used when unset.'],
      ['RPC_URL_BASE', 'Server-side endpoint.'],
      ['RPC_URL_ARBITRUM', 'Server-side endpoint.'],
      ['RPC_URL_OPTIMISM', 'Server-side endpoint.'],
      ['RPC_URL_POLYGON', 'Server-side endpoint.'],
    ],
  },
  {
    title: 'Feature flags',
    vars: [
      ['TRANSACTION_EXECUTION_ENABLED', 'Master switch for requesting wallet signatures. Defaults to false.'],
      ['DEMO_MODE', 'Serves labelled fixtures when credentials are absent. Never a silent fallback.'],
      ['NEXT_PUBLIC_ROUTEFOLD_URL', 'Public URL of a separate Routefold deployment.'],
    ],
  },
  {
    title: 'Provider-ready',
    vars: [
      ['SIMULATION_PROVIDER', 'Enables deep simulation. Unset means local validation only.'],
      ['SWAP_PROVIDER', 'Enables swap route quotes and calldata.'],
      ['BRIDGE_PROVIDER', 'Enables bridge route comparison and calldata.'],
      ['PORTFOLIO_PROVIDER', 'Enables USD pricing for volatile assets.'],
    ],
  },
] as const

const COMMANDS = [
  ['pnpm install', 'Install dependencies'],
  ['pnpm db:migrate', 'Apply migrations to a local database'],
  ['pnpm db:seed', 'Seed labelled demo data for one user'],
  ['pnpm dev', 'Start the development server'],
  ['pnpm lint', 'Lint'],
  ['pnpm typecheck', 'Type-check with no emit'],
  ['pnpm test', 'Unit and integration tests'],
  ['pnpm test:e2e', 'Playwright smoke tests against a production build'],
  ['pnpm build', 'Production build'],
] as const

export default function DocsPage() {
  return (
    <>
      <PageHero
        eyebrow="Documentation"
        title="Reference"
        lede="Supported networks and assets, the intent vocabulary, the plan status machine, and every environment variable ZeFi reads."
      />

      {/* ── Networks ─────────────────────────────────────────────────── */}
      <section className="section" id="networks">
        <div className="shell">
          <SectionHeader
            eyebrow="Registry"
            title="Supported networks"
            lede="Capability is stated per chain. “Plan-only” means ZeFi understands the chain well enough to route to it but holds no wallet connection there."
          />
          <div className="mt-10 overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[44rem] border-collapse text-left">
              <thead>
                <tr className="bg-sand/50">
                  {['Network', 'Chain id', 'Native', 'Capability', 'Explorer'].map((header) => (
                    <th key={header} scope="col" className="label-tech-sm px-5 py-3 text-ink-muted">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CHAIN_KEYS.map((key) => {
                  const chain = CHAINS[key]
                  if (!chain) return null
                  return (
                    <tr key={key} className="border-t border-line bg-white">
                      <th scope="row" className="px-5 py-3.5 text-[0.875rem] font-medium text-ink">
                        {chain.name}
                      </th>
                      <td className="num px-5 py-3.5 text-[0.8125rem] text-ink-soft">
                        {chain.chainId ?? '—'}
                      </td>
                      <td className="num px-5 py-3.5 text-[0.8125rem] text-ink-soft">
                        {chain.nativeCurrency.symbol}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={
                            chain.capability === 'read-and-execute'
                              ? 'chip chip-positive'
                              : chain.capability === 'read-only'
                                ? 'chip chip-info'
                                : 'chip chip-caution'
                          }
                        >
                          {chain.capability === 'read-and-execute'
                            ? 'Read and execute'
                            : chain.capability === 'read-only'
                              ? 'Read only'
                              : 'Plan only'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[0.8125rem]">
                        <a
                          href={chain.explorerUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="link-underline text-ink-soft"
                        >
                          {chain.explorerUrl.replace(/^https?:\/\//, '')}
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="panel-quiet mt-4 p-5">
            <p className="label-tech-sm text-ink-muted">Verified assets</p>
            <p className="mt-2.5 flex flex-wrap gap-1.5">
              {KNOWN_SYMBOLS.map((symbol) => (
                <span key={symbol} className="chip">
                  {symbol}
                </span>
              ))}
            </p>
            <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-soft">
              Addresses and decimals for these assets are curated and stored EIP-55 checksummed. A test
              asserts every address in the registry is a valid checksummed address, so a typo fails the
              build rather than reaching a user. Any asset outside this list requires an explicit
              contract address — ZeFi will not guess one.
            </p>
          </div>
        </div>
      </section>

      {/* ── Vocabulary ───────────────────────────────────────────────── */}
      <section className="section pt-0">
        <div className="shell grid gap-4 lg:grid-cols-2">
          <div className="panel-solid p-6">
            <h2 className="label-tech text-ink-soft">Intent categories</h2>
            <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
              {INTENT_TYPES.map((type) => (
                <li key={type} className="num text-[0.8125rem] text-ink-soft">
                  {type}
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t border-line pt-4 text-[0.8125rem] leading-relaxed text-ink-soft">
              SEND, SWAP, BRIDGE, APPROVE and CONTRACT_INTERACTION are transactional and produce a plan.
              The rest are answered directly.
            </p>
          </div>

          <div className="panel-solid p-6">
            <h2 className="label-tech text-ink-soft">Plan statuses</h2>
            <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
              {PLAN_STATUSES.map((status) => (
                <li key={status} className="text-[0.8125rem] text-ink-soft">
                  <span className="num text-ink-muted">{status}</span> — {PLAN_STATUS_LABELS[status]}
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t border-line pt-4 text-[0.8125rem] leading-relaxed text-ink-soft">
              Transitions are enforced by an explicit state machine. An invalid transition throws rather
              than silently succeeding; <span className="num">confirmed</span>,{' '}
              <span className="num">failed</span> and <span className="num">cancelled</span> are terminal.
            </p>
          </div>
        </div>
      </section>

      {/* ── Environment ──────────────────────────────────────────────── */}
      <section className="section pt-0" id="environment">
        <div className="shell">
          <SectionHeader
            eyebrow="Configuration"
            title="Environment variables"
            lede="Every variable ZeFi reads. Absent credentials produce a labelled, degraded mode — never a silent fallback and never a fabricated value."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {ENV_GROUPS.map((group) => (
              <section key={group.title} className="panel-quiet p-6">
                <h3 className="label-tech text-ember-700">{group.title}</h3>
                <dl className="mt-4 space-y-3">
                  {group.vars.map(([name, description]) => (
                    <div key={name}>
                      <dt className="num text-[0.75rem] break-all text-ink">{name}</dt>
                      <dd className="mt-0.5 text-[0.8125rem] leading-relaxed text-ink-soft">
                        {description}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </div>
      </section>

      {/* ── Commands ─────────────────────────────────────────────────── */}
      <section className="section pt-0">
        <div className="shell">
          <SectionHeader eyebrow="Running ZeFi" title="Commands" />
          <ul className="mt-10 divide-y divide-line overflow-hidden rounded-2xl border border-line">
            {COMMANDS.map(([command, description]) => (
              <li
                key={command}
                className="flex flex-col gap-1 bg-white px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <code className="num text-[0.8125rem] text-ink">{command}</code>
                <span className="text-[0.8125rem] text-ink-soft">{description}</span>
              </li>
            ))}
          </ul>

          <p className="mt-6 text-[0.875rem] leading-relaxed text-ink-soft">
            Full setup, architecture and deployment notes live in the repository:{' '}
            <span className="num text-ink">README.md</span>,{' '}
            <span className="num text-ink">ARCHITECTURE.md</span>,{' '}
            <span className="num text-ink">SECURITY.md</span>,{' '}
            <span className="num text-ink">DEPLOYMENT.md</span>,{' '}
            <span className="num text-ink">TRANSACTION_SAFETY.md</span> and{' '}
            <span className="num text-ink">AI_SYSTEM.md</span>. See also{' '}
            <Link href="/how-it-works" className="link-underline">
              how it works
            </Link>{' '}
            for the capability matrix.
          </p>
        </div>
      </section>
    </>
  )
}
