# Deployment

Target: **Vercel**, serving **zefi.ae**.

---

## 1. Database

ZeFi needs PostgreSQL. Supabase, Neon, Railway and RDS all work.

### Supabase

Supabase's *direct* connection (`db.<ref>.supabase.co:5432`) is IPv6-only and will not
resolve from most CI and serverless environments. Use the **pooler**:

```bash
# Runtime — transaction pooler
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-1-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Migrations — session pooler (pgbouncer cannot run DDL)
DIRECT_URL="postgresql://postgres.<ref>:<password>@aws-1-<region>.pooler.supabase.com:5432/postgres"
```

**URL-encode the password.** `@` → `%40`, `#` → `%23`, `!` → `%21`, `/` → `%2F`. An
unencoded `@` silently truncates the host and produces a confusing "can't reach
database server".

Find the region: Project Settings → Database → Connection string. Or resolve
`db.<ref>.supabase.co` — an IPv6 address starting `2406:da1a` is `ap-south-1`.

### Apply the schema

```bash
pnpm db:deploy    # picks up DIRECT_URL from the schema's datasource
pnpm db:seed      # optional: one labelled demo user (explicit — not run by migrate)
```

To inspect the SQL without a database:

```bash
pnpm db:sql
```

---

## 2. Authentication

[dashboard.clerk.com](https://dashboard.clerk.com) → **API keys**.

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_…
CLERK_SECRET_KEY=sk_live_…
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/app
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/app
```

In Clerk → **Domains**, add `zefi.ae` and complete the DNS records Clerk issues for the
production instance. Test keys work on preview deployments; use live keys on the
production domain.

---

## 3. AI provider

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-…
OPENAI_MODEL=gpt-4.1
```

Or switch vendor without touching code:

```bash
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-…
ANTHROPIC_MODEL=<a model your key can access>
```

Model identifiers are never hardcoded. If the model is unset, the AI layer reports
itself unavailable rather than guessing.

---

## 4. RPC endpoints

Public endpoints work but rate limit hard. For production, use dedicated ones:

```bash
RPC_URL_ETHEREUM=https://eth-mainnet.g.alchemy.com/v2/…
RPC_URL_BASE=https://base-mainnet.g.alchemy.com/v2/…
RPC_URL_ARBITRUM=…
RPC_URL_OPTIMISM=…
RPC_URL_POLYGON=…
```

These are server-side only. The `NEXT_PUBLIC_RPC_URL_*` variants are optional overrides
for the browser; leave them unset and balance reads are proxied through the server.

They matter more once `SIMULATION_PROVIDER=rpc` is set, because every plan then costs an
`eth_call` and a gas estimate on top of the balance reads. On a public endpoint that is
what gets rate limited first, and a throttled simulation degrades to `local_only` — safe,
but it means the deep check silently stops running when you most want it.

---

## 5. Wallet connection

[cloud.reown.com](https://cloud.reown.com) → project id.

```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=…
```

Add `zefi.ae` to the project's allowed domains. Without a project id the WalletConnect
connector is not registered at all — injected and Coinbase Wallet still work, and the
wallet menu says why.

---

## 6. Feature flags

```bash
# Master switch for requesting wallet signatures.
TRANSACTION_EXECUTION_ENABLED=true
NEXT_PUBLIC_TRANSACTION_EXECUTION_ENABLED=true

# Turn demo fixtures off once real providers are configured.
DEMO_MODE=false
NEXT_PUBLIC_DEMO_MODE=false
```

Both halves of each pair must agree — the server enforces, the client renders.

Ship with execution **off** first. Verify plans, simulation and the approval flow
against the real deployment, then enable it.

---

## 7. Routefold

```bash
NEXT_PUBLIC_ROUTEFOLD_URL=https://routefold.com
```

Unset, every Routefold link resolves to the on-site product page at
`/products/routefold`. Set to an absolute URL and links open the separate deployment in
a new tab, with `rel="noreferrer noopener"`. `/app/routefold` states which of the two is
in effect.

---

## 8. Vercel

```bash
pnpm dlx vercel link
pnpm dlx vercel env pull .env.local     # or set variables in the dashboard
pnpm dlx vercel --prod
```

Settings that matter:

| Setting | Value |
| --- | --- |
| Framework | Next.js (auto-detected) |
| Build command | `pnpm build` (runs `prisma generate` first) |
| Install command | `pnpm install` |
| Node version | 20.x or later |
| Region | Close to your database — `bom1` for a Mumbai Supabase project |

Set every environment variable for **Production**, **Preview** and **Development** as
appropriate. `NEXT_PUBLIC_*` variables are baked in at build time, so changing one
requires a redeploy, not just a restart.

---

## 9. zefi.ae

### Pick one primary domain, and point the other at it

This is the step that most often produces a 404 on a healthy deployment. In
Vercel → Project → **Domains**:

| Domain | Setting |
| --- | --- |
| `zefi.ae` | **Primary** — serves the project |
| `www.zefi.ae` | Redirect to `zefi.ae` |

Both must be *added to the project*. A domain configured to redirect to a
hostname that is not itself attached to the project produces
`x-vercel-error: NOT_FOUND` — the redirect resolves, the target does not.

Diagnose it in one command:

```bash
curl -sIL https://zefi.ae | grep -iE "^HTTP|^location|x-vercel-error"
```

- `308` → `location: https://www.zefi.ae/` → `404 NOT_FOUND` means the apex is
  redirecting to a `www` that is not bound to the project. Swap which one is
  primary, or add the missing one.
- `200` on the first hop means you are done.

Whichever you choose must match `NEXT_PUBLIC_APP_URL` exactly, with no trailing
slash. That value drives canonical URLs, `sitemap.xml`, `robots.txt` and Open
Graph metadata, so a mismatch means every canonical points at a redirect.

### DNS

Vercel's anycast addresses changed; use whatever the dashboard shows for your
project rather than a value copied from an older guide.

| Type | Name | Value |
| --- | --- | --- |
| `A` | `@` | `216.198.79.1` (Vercel will confirm the current address) |
| `CNAME` | `www` | `cname.vercel-dns.com` |

Simplest alternative: delegate the zone to Vercel's nameservers and let it
manage both records.

### Deployment Protection

A fresh project has **Vercel Authentication** enabled, which SSO-redirects
`*.vercel.app` URLs. That is fine for previews, but if you plan to share a
deployment URL — with a directory, an investor, or a partner — set
Settings → **Deployment Protection** → Vercel Authentication to *Only Preview
Deployments*, or the recipient sees a login wall.

### Verify

```bash
curl -s https://zefi.ae/api/health | jq
curl -sI https://zefi.ae | grep -i strict-transport-security
curl -s https://zefi.ae/robots.txt
```

### When it 404s

Three failures look identical from the browser — a 404 on a route that exists.
They are told apart by *which* routes fail.

**Every route 404s, but files under `public/` still load.** The project was built
with the wrong framework preset. Vercel's "Other" preset defaults
`outputDirectory` to `public/`, so `.next` is discarded and the static folder is
served on its own. Check it:

```bash
curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v9/projects/$VERCEL_PROJECT_ID" | jq '{framework, buildCommand, outputDirectory}'
```

`framework` must be `"nextjs"`. Setting it re-routes the build output; no code
change is involved.

**Only `/app` and friends 404, while marketing routes are fine.** This is
`auth.protect()` choosing a 404 over a redirect. Left to its default it decides
between the two by inspecting the request, and it picks 404 whenever it cannot
resolve the visitor's state — which is exactly what a signed-out browser looks
like before the auth provider's handshake has run. The response carries the
reason:

```bash
curl -sI https://zefi.ae/app | grep -i x-clerk-auth
# x-clerk-auth-reason: protect-rewrite, dev-browser-missing
```

`proxy.ts` names the destination explicitly for page requests, so this should not
recur. API routes keep the default, where redirecting to an HTML sign-in page
would be the wrong answer to a fetch.

**Nothing changed at all after a push.** Confirm the push actually landed. A
GitHub deploy key added without *Allow write access* accepts fetches and rejects
pushes, so `git push` fails locally while the last deployment stays live and
healthy — nothing in Vercel indicates a problem, because Vercel never heard
about the commit.

---

## 10. Post-deploy checklist

- [ ] `curl -sIL https://zefi.ae` returns 200 on the first hop, not a redirect to a 404
- [ ] `/api/health` reports the capabilities you expect
- [ ] `/` renders with no console errors
- [ ] `/app` redirects an anonymous visitor to sign-in
- [ ] Sign-up completes and lands on `/app`
- [ ] A conversation persists across a reload
- [ ] Wallet connects and balances read
- [ ] A plan reaches `ready_for_signature`
- [ ] The confirm dialog restates network, asset, amount and recipient
- [ ] `robots.txt` and `sitemap.xml` reference `zefi.ae`
- [ ] HSTS present on the production domain

---

## Running with fewer credentials

Nothing is mandatory. Each missing credential degrades one capability, visibly:

| Missing | Effect |
| --- | --- |
| `DATABASE_URL` | No persistence. Every history surface says so. |
| Clerk keys | `/app` renders "authentication is not configured". |
| AI keys | Deterministic engine only, labelled, when `DEMO_MODE=true`. |
| `SIMULATION_PROVIDER` | Local validation only, stated on every plan. |
| `SWAP_PROVIDER` / `BRIDGE_PROVIDER` | Those steps are plan-only, with the variable named. |
| WalletConnect id | That connector is not offered; others still work. |

A failed provider is **never** replaced by a fixture. Demo mode is a deliberate state,
not a fallback.
