# ZeFi

**The AI operating system for onchain finance.**
Ask. Plan. Execute onchain.

ZeFi sits between human intent and onchain execution. It interprets what a person
means, resolves that into a structured and validated transaction plan, explains the
plan in plain language, and waits for explicit approval before the user's own wallet
signs anything.

Routefold — ZeFi's multichain expansion-intelligence platform — is a product of the
same company.

---

## What actually runs today

| Capability | Status | Depends on |
| --- | --- | --- |
| Crypto explanations and Q&A | **Live** | `OPENAI_API_KEY` + `OPENAI_MODEL` |
| Native + ERC-20 balance reads (5 EVM networks) | **Live** | RPC endpoints (public fallbacks work) |
| Natural-language → typed intent (10 categories) | **Live** | AI provider |
| Deterministic transaction planning | **Live** | Nothing — runs with no credentials |
| Local simulation (8 checks) | **Live** | Nothing |
| Native-currency transfers | **Live** | `TRANSACTION_EXECUTION_ENABLED=true` |
| ERC-20 transfers (registry tokens) | **Live** | `TRANSACTION_EXECUTION_ENABLED=true` |
| Persistent conversations, plans, history | **Live** | `DATABASE_URL` |
| Deep simulation against live chain state | **Live** | `SIMULATION_PROVIDER=rpc` |
| Fork traces and full account diffs | Provider required | A vendor adapter |
| Swap execution | Provider required | `SWAP_PROVIDER` |
| Bridge execution | Provider required | `BRIDGE_PROVIDER` |
| USD amounts on volatile assets | Provider required | `PORTFOLIO_PROVIDER` |
| Scheduled / conditional execution | Not built | — |
| Policy-bounded autonomous agents | Not built | Smart accounts |
| Solana transactions | Not built | Recognised for planning only |

"Provider required" means ZeFi builds the plan, validates it, shows the steps and the
risks — and then declines to produce calldata. It does not fake a success state.

---

## Quick start

```bash
pnpm install
cp .env.example .env.local     # fill in what you have; nothing is mandatory
pnpm dev
```

ZeFi runs with **zero credentials**. Without them it serves labelled demo fixtures and
says so on every surface. Add credentials to light up capabilities one at a time.

### Minimum for a real assistant

```bash
OPENAI_API_KEY=sk-…
OPENAI_MODEL=gpt-4.1
```

### Minimum for accounts and persistence

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_…
CLERK_SECRET_KEY=sk_…
DATABASE_URL=postgresql://…
```

Then:

```bash
pnpm db:deploy
pnpm db:seed
```

---

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Development server |
| `pnpm build` | Production build (runs `prisma generate` first) |
| `pnpm start` | Serve the production build |
| `pnpm lint` | ESLint, including the React Compiler rules |
| `pnpm typecheck` | `tsc --noEmit`, strict |
| `pnpm test` | Unit + integration tests (192, no network) |
| `pnpm test:e2e` | Playwright smoke tests against a production build |
| `pnpm verify` | lint → typecheck → test |
| `pnpm db:migrate` | Create and apply a migration in development |
| `pnpm db:deploy` | Apply existing migrations (production) |
| `pnpm db:seed` | Seed one labelled demo user |
| `pnpm db:sql` | Print the schema as SQL without touching a database |
| `pnpm brand:render` | Regenerate every brand asset in `/launch-kit` |

---

## Architecture in one paragraph

A language model interprets and explains. Deterministic code decides. Between them
sits a **transaction plan** — an artefact a person can read that states what ZeFi
understood, what it assumed, what it will do, what it costs, what it cannot do, and
where every number came from. Contract addresses, decimals and chain ids come from a
curated registry; amounts come from the user and are converted with `BigInt`, never
through a float. A model has no path by which it can introduce a value into a
transaction.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full picture, and
[AI_SYSTEM.md](./AI_SYSTEM.md) for the eight-stage pipeline.

---

## Repository layout

```
app/
  (marketing)/       Public site — 10 routes
  (auth)/            Sign-in and sign-up
  app/               Authenticated product — 8 routes
  api/               Chat, conversations, wallet, plans, transactions, health
components/
  brand/             ZeFi + Routefold marks, generated from shared geometry
  marketing/         Hero, sections, page shells
  app/               Dashboard, chat, wallet, approval flow
  plan/              The transaction-plan interface (shared by both)
  ui/                Primitives
lib/
  ai/                Provider interface + OpenAI and Anthropic adapters, pipeline, prompts
  chains/            Chain and asset registry — the deterministic ground truth
  intent/            Zod schemas, classifier, registry resolver
  planner/           Plan construction, risk engine, status machine
  simulation/        Simulation interface + local deterministic validator
  providers/         Swap / bridge / portfolio adapter interfaces
  db/                Prisma client + ownership-scoped repositories
  wallet/            Server-side reads (viem) and client config (wagmi)
  security/          Validation, rate limiting, prompt sanitisation
prisma/              Schema, migration, seed
tests/               Unit, integration, Playwright
launch-kit/          Brand assets and launch copy
```

---

## Documentation

| Document | Contents |
| --- | --- |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design, data flow, layer boundaries |
| [AI_SYSTEM.md](./AI_SYSTEM.md) | The eight-stage pipeline, prompts, provider swap |
| [TRANSACTION_SAFETY.md](./TRANSACTION_SAFETY.md) | What ZeFi will and will not sign, and why |
| [SECURITY.md](./SECURITY.md) | Controls, threat model, and honest limitations |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Vercel, zefi.ae, database, Routefold |

---

## Licence and disclaimer

ZeFi provides informational, technical, and transaction-planning tools. Outputs may
contain incomplete assumptions and do not constitute financial, investment, legal,
tax, compliance, or security-audit advice.

**ZeFi never requests or stores seed phrases or private keys. Connected wallets retain
custody and sign transactions directly.**
