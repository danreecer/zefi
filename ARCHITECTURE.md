# Architecture

## The central idea

Onchain finance asks two different kinds of question, and they need two different
kinds of answer.

*What does this person want?* is a language question. A model reads "move two thousand
dollars of USDC from Base to Solana, safest route" and correctly identifies the action,
the asset, both networks and the priority. That is a genuine advance over a form.

*Is this address correct? Does this token have six decimals or eighteen? Does the
balance cover the amount?* are not language questions. They have exact answers. A
system that answers them probabilistically is right almost every time — which is
precisely the failure mode that costs people money, because "almost every time" is
indistinguishable from "always" until it is not.

ZeFi splits the work along that line and keeps the halves apart.

```
                    ┌──────────────────────────────────────────┐
   human intent ───►│  INTERPRETATION            language model │
                    └────────────────┬─────────────────────────┘
                                     │ typed intent (Zod)
                    ┌────────────────▼─────────────────────────┐
                    │  RESOLUTION       chain & asset registry │
                    │  VALIDATION       checksums, BigInt      │
                    │  PLANNING         actions, risk, status  │
                    │  SIMULATION       deterministic checks   │
                    └────────────────┬─────────────────────────┘
                                     │ transaction plan
                    ┌────────────────▼─────────────────────────┐
                    │  EXPLANATION               language model │
                    └────────────────┬─────────────────────────┘
                                     │
                    ┌────────────────▼─────────────────────────┐
                    │  HUMAN APPROVAL      explicit, per action │
                    └────────────────┬─────────────────────────┘
                                     │
                    ┌────────────────▼─────────────────────────┐
   onchain      ◄───│  USER'S OWN WALLET SIGNS                 │
                    └──────────────────────────────────────────┘
```

The model appears twice and owns nothing in between.

---

## The invariant

> **Model output cannot become transaction data.**

This is enforced structurally, not by review:

| Value | Where it comes from |
| --- | --- |
| Contract address | `lib/chains/registry.ts`, EIP-55 checksummed, unit-tested |
| Token decimals | Same registry |
| Chain id | Same registry |
| Amount | The user's own text, validated as a decimal string, converted with `BigInt` |
| Recipient | The user's own text, checksummed and screened |
| Gas estimate | A real `eth_estimateGas`, or `null` |
| Balance | A real RPC read, timestamped, or absent |
| Plan status | An explicit state machine |
| Risk findings | A deterministic rules engine |

The model produces exactly two things: a **typed intent** (which is then re-resolved
against the registry and can only narrow what happens) and **prose**.

---

## Layers

### `lib/chains` — ground truth

Five EVM networks plus Solana, and a curated asset registry. Each chain declares a
`capability`:

- `read-and-execute` — balance reads and user-signed transfers
- `read-only` — reads only
- `plan-only` — ZeFi can route *to* it but holds no connection there (Solana)

`tests/unit/chains.test.ts` asserts every address is valid and checksummed, so a typo
fails the build rather than reaching a user.

### `lib/intent` — language to structure

`classify.ts` is a deterministic classifier that runs *before* the model. It serves
three purposes: it gives the model a prior, it is the complete classifier when no AI
provider is configured, and — unlike the model — it is unit-testable.

`resolve.ts` is the gate. It takes a structured intent and re-derives everything from
the registry, distinguishing two failure modes:

- **missing** — a field the user has not supplied (ask a focused question)
- **blockers** — something present but wrong or unsupported (explain it)

### `lib/planner` — structure to sequence

`build.ts` produces the ordered actions. Every action carries an `executionMode`:

- `wallet_signature` — ZeFi can build the calldata; the wallet signs it
- `provider_required` — described in full, but no calldata without a routing provider
- `informational` — no transaction (bridge settlement, decoded contract calls)

`risk.ts` is a rules engine over the plan. The model can *explain* a finding; it cannot
add, remove or downgrade one.

`types.ts` holds the eleven-state machine. `transition()` is the only supported way to
change status and throws on an illegal move. `submitted → cancelled` is deliberately
absent: ZeFi cannot cancel a broadcast transaction, so no state implies it can.

### `lib/simulation` — verification

An interface with one shipped implementation. `LocalSimulationProvider.deep` is
permanently `false`, and a check that could not run reports `skipped` — never `pass`.
`summariseChecks` cannot return `passed` for a shallow run; it returns `local_only`.

### `lib/ai` — replaceable interpretation

A provider interface with two adapters: **OpenAI** (default) and **Anthropic**. Both
obtain structured output through a forced tool call, validate with Zod, allow exactly
one repair attempt, and then fail honestly. Switching `AI_PROVIDER` changes which
vendor answers and nothing else about how ZeFi behaves.

### `lib/db` — ownership-scoped access

Every function that touches user-owned data takes `userId` first and includes it in the
`where` clause. There is no `findUnique({ where: { id } })` on a user-owned row
anywhere in the file. `tests/integration/repositories.test.ts` asserts this by
inspecting every query the repositories issue.

---

## Data flow for one turn

```
POST /api/chat
  ├─ requireUser()                    auth, then ZeFi profile id
  ├─ checkAssistantLimits()           per-minute and per-day
  ├─ ChatRequestSchema.parse()        shape, length, address validity
  ├─ appendMessage(user)              the user's own message lands first
  └─ runAssistantTurn()
       1  classifyIntent()            deterministic
       2  generateStructured()        model → Zod
       3  resolveIntent()             registry, checksums, decimals
       4  readChainBalances()         server-side RPC, timestamped
       5  buildPlan()                 deterministic
       6  runSimulation()             deterministic
       7  generateText()              model, given the finished plan
       8  return                      plan + risks + provenance + stages
  ├─ saveIntentAndPlan()
  └─ appendMessage(assistant)
```

Stages 2 and 7 are the only ones a model touches.

---

## Degradation

Three honest states, never silently interchanged:

| State | Meaning | Behaviour |
| --- | --- | --- |
| **configured** | Credential present, provider used | Normal |
| **demo** | No credential | Labelled fixtures, `DEMO_MODE=true` |
| **unavailable** | Credential present, call failed | **Error** |

A failed provider never becomes a fixture. `describeCapabilities()` in
`lib/config/env.ts` is the single source of truth, surfaced in the app's deployment
banner, on `/app/settings`, and at `/api/health`.

---

## Rendering

Server components by default. Client components only where interaction requires it:
the ambient field (pointer tracking), the hero and scroll sections (Framer Motion),
wallet connection (wagmi), chat, and the approval dialog.

The marketing site is fully static. `/app` is `force-dynamic` — it is per-user by
definition and there is nothing to cache.

---

## Design system

`app/globals.css` holds **Ambient Intelligence**: warm neutrals, an ember scale used as
atmospheric light rather than component fill, midnight only at edges for contrast, and
hairline borders instead of heavy shadow. Tailwind v4's `@theme` exposes the tokens;
`@utility` defines the surface treatments (`zefi-frame`, `panel`, `ambient-field`).

Brand marks are generated from one file — `components/brand/geometry.ts` — by both the
React components and `scripts/render-brand.ts`, so the header logo and the exported
SVGs are the same artwork rather than two copies that drift.
