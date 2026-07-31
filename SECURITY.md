# Security

**Report a vulnerability:** security@zefi.ae. Please include reproduction steps and
allow a reasonable window before public disclosure.

---

## The statement

> **ZeFi never requests or stores seed phrases or private keys. Connected wallets
> retain custody and sign transactions directly.**

There is no wallet client with a private key in this codebase, no route that accepts
key material, and no server-side signing path. `lib/wallet/server-reads.ts` builds a
viem `PublicClient` — a type that cannot sign.

---

## Controls

### Custody
- No key material is requested, transmitted, or stored, ever
- No server-side signing path exists
- ZeFi holds no user funds at any point
- Every transaction is signed in the user's own wallet, in their browser

### Transaction integrity
- Contract addresses, decimals and chain ids come from a curated registry, never a model
- Every registry address is EIP-55 checksummed, asserted by `tests/unit/chains.test.ts`
- Recipients are checksummed and screened for burn addresses and self-transfers
- Amounts are decimal strings converted with `BigInt` — never through a float
- Approvals are planned exact-amount; the local simulator *fails* an unlimited approval
- Duplicate submission is prevented by two uniqueness constraints plus an idempotency key
- Plan status moves through an explicit machine; illegal transitions throw

### Authorisation
- `/app/*` and every mutating API route are protected by middleware
- Every user-owned query is scoped by the authenticated user's id
- No `findUnique({ where: { id } })` on a user-owned row exists in `lib/db/repositories.ts`
- "Not found" and "belongs to someone else" return the same response — the difference is
  itself information
- `tests/integration/repositories.test.ts` inspects every query the repositories issue
  and fails if one is unscoped
- Two identities are kept distinct: the Clerk id and ZeFi's own profile id. Repositories
  accept only the second

### AI boundaries
- Model output is structurally incapable of becoming transaction data
- User text is sanitised of control characters, zero-width marks and bidi overrides
- Untrusted content is framed in delimiters the system prompt identifies as data, and
  forged delimiters are stripped
- Structured output is a forced tool call, Zod-validated, with one repair attempt
- A configured-but-failing provider produces an error, never a fixture
- System prompts are server-only and never shipped to a client

### Rendering
- No `dangerouslySetInnerHTML` anywhere; `react/no-danger` is an ESLint **error**
- Assistant output renders through `components/ui/rich-text.tsx`, which understands four
  markers and treats everything else as literal text

### Transport
- CSP with `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `form-action 'self'`
- HSTS with `includeSubDomains; preload` in production
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` disabling camera, microphone, geolocation, payment and interest-cohort
- `Cross-Origin-Opener-Policy: same-origin-allow-popups`
- `poweredByHeader: false`

### Rate limiting
- Assistant surface: per-minute and per-day, both configurable
- Mutations: 60/minute
- `X-RateLimit-*` headers on every limited response, `Retry-After` when refused

### Auditability
- Every mutation writes an `ActivityEvent` scoped to the acting user
- Usage is recorded per action type
- Users can read their own log at `/app/history`

---

## Known limitations

A security page that lists only strengths is a marketing page. These are the trade-offs
a reviewer would find anyway.

### The CSP permits inline scripts

Next.js emits an inline bootstrap script for every statically rendered route. A
nonce-based policy requires forcing dynamic rendering across the marketing site. The
high-value directives are enforced strictly; `script-src 'unsafe-inline'` is the
documented compromise.

**Mitigation path:** nonce-based CSP for `/app` only, where rendering is already
dynamic.

### `connect-src` allows `https:` and `wss:`

Users configure their own JSON-RPC endpoints and wallet providers dial arbitrary
relays. A fixed allowlist would break WalletConnect and any self-hosted RPC.

### The default rate limiter is per-instance

The in-memory limiter means the effective ceiling on a serverless platform is the
configured limit × live instances.

**Mitigation:** set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

### Deep simulation is not configured by default

Local deterministic validation always runs. Without `SIMULATION_PROVIDER`, ZeFi has not
executed the transaction against chain state — and says so on every plan rather than
implying coverage it does not have.

### Recipient type is not verified offline

ZeFi cannot tell without a network call whether an address is a contract or an
externally-owned account. This is surfaced as a `RECIPIENT_TYPE_UNVERIFIED` info
finding on every plan with a recipient.

### Name resolution is not performed

`vitalik.eth` is rejected as "a name, not an address" rather than silently resolved.
Name resolution is a network read with its own failure and spoofing modes, and doing it
badly is worse than not doing it.

### No independent audit

No third-party security audit has been performed on this codebase. Anyone evaluating
ZeFi for material value should treat that as a live consideration.

---

## Secret handling

- `CLERK_SECRET_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `DATABASE_URL` and every
  provider key are read only through `lib/config/env.ts`, which is `server-only`
- `lib/config/public.ts` is the *only* module that reads `NEXT_PUBLIC_*`, and every read
  is a literal member expression so nothing else can be inlined by accident
- `/api/health` reports whether each capability is configured — never a value
- `.env.local` is gitignored; `.env.example` contains placeholders only

**If a key has been shared in a chat, a ticket, or a screenshot, rotate it.** Exposure
is not undone by deleting the message.

---

## Disclaimer

ZeFi provides informational, technical, and transaction-planning tools. Outputs may
contain incomplete assumptions and do not constitute financial, investment, legal, tax,
compliance, or security-audit advice.
