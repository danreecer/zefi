# ZeFi launch kit

Everything needed to represent ZeFi outside the product. Every asset here is generated
from `components/brand/geometry.ts` by `pnpm brand:render`, so the marks in this folder
and the marks in the product are the same artwork — not two copies that drift.

```
launch-kit/
├── svg/          20 vector sources
├── png/          rasterised exports
└── README.md     this file — copy, usage, screenshot checklist
```

---

## The marks

### ZeFi symbol

Three candidate routes leave a single prompt (the top rail), fan out, and converge on
one verification node. A single confident stroke exits that node and lands on the
execution rail. The silhouette — rail, diagonal, rail — is a Z, but the Z is a
consequence of the routing diagram rather than a letter with decoration bolted on.

The two rejected routes are drawn **dotted**: the line style carries the meaning. Solid
is the route ZeFi selected; dotted is a route it evaluated and set aside. At favicon
sizes the dotted routes drop away and the mark resolves cleanly to its structure.

### Routefold symbol

The deliberate inverse. Where ZeFi collapses many possible routes into one verified
action, Routefold takes one product and unfolds it into ranked destinations: a spine
with three rails whose *length encodes chain-fit rank*, and an accent node on the
top-ranked one. Same canvas, same stroke weight, same node vocabulary — opposite
direction of travel.

### Wordmark

Monolinear geometric letterforms on a 72-unit cap height with an 11-unit stem. The Z is
the symbol's own geometry at text scale, which is what ties the lockup together. Drawn
as strokes, so weight stays perfectly even and the mark never depends on a font.

---

## Files

| File | Use |
| --- | --- |
| `zefi-symbol.svg` | Primary mark, light backgrounds |
| `zefi-symbol-dark-bg.svg` | Primary mark, dark backgrounds |
| `zefi-symbol-mono.svg` | Single colour — stamps, embroidery, faxes |
| `zefi-symbol-simple.svg` | No dotted routes — below 24px |
| `zefi-wordmark.svg` | Wordmark alone |
| `zefi-logo-horizontal-light.svg` | **Default lockup** |
| `zefi-logo-horizontal-dark.svg` | Lockup on dark |
| `zefi-logo-horizontal-mono.svg` | Single-colour lockup |
| `zefi-logo-stacked-light.svg` | Square placements |
| `zefi-app-icon.svg` | Ember plate, 512 |
| `zefi-launch-icon-square.svg` | Ember plate, 1024 — app stores, directories |
| `zefi-favicon.svg` | Browser tab |
| `zefi-avatar.svg` | Social avatar, cream ground |
| `routefold-symbol.svg` | Routefold mark |
| `routefold-logo-light.svg` | Routefold lockup |
| `png/zefi-og-1200x630.png` | Open Graph / Twitter card |
| `png/_contact-sheet.png` | Every mark at every shipping size — for QA |

Regenerate everything:

```bash
pnpm brand:render
```

---

## Colour

| Token | Hex | Use |
| --- | --- | --- |
| Ink | `#17130F` | Type, marks on light |
| Ivory | `#FDFAF4` | Page ground, marks on dark |
| Cream | `#F8F1E6` | Secondary surface |
| Ember 500 | `#FF6F22` | Atmospheric light |
| Ember 600 | `#ED4F08` | **Accent — nodes, eyebrows, emphasis** |
| Ember 700 | `#C23C06` | Accent on light surfaces |
| Amber | `#FF9A3D` | Accent on dark |
| Midnight | `#0F172A` | Contrast plates only |

Orange is **light, not paint**. It belongs in gradients, glows and single accents —
never as a flat fill across a component. Midnight appears only at edges and on
dedicated dark plates.

---

## Type

| Role | Face | Notes |
| --- | --- | --- |
| Display | **Space Grotesk** | Uppercase, weight 400, tracking `0.005em` |
| Body | **Inter** | |
| Technical | **JetBrains Mono** | Labels, addresses, all numerals |

Numerals are always monospace and tabular. A figure a user might reconcile against
their wallet should never shift as it updates.

---

## Copy

**Name:** ZeFi
**Domain:** zefi.ae
**Tagline:** Ask. Plan. Execute onchain.
**Descriptor:** The AI operating system for onchain finance.

### Short bio (one line, 96 characters)

> ZeFi turns natural-language intent into verified onchain actions. Ask. Plan. Execute onchain.

### Standard bio (55 words)

> ZeFi is the AI operating system for onchain finance. It interprets what you mean,
> resolves it into a validated transaction plan, explains the plan in plain language,
> and waits for your explicit approval before your own wallet signs. Routefold — ZeFi's
> multichain expansion-intelligence platform — is a product of the same company.

### Long description

> ZeFi builds artificial intelligence infrastructure for understanding, planning,
> simulating, and executing onchain financial activity, and sits between human intent
> and onchain execution.
>
> Language models read intent well. They should never be the thing that decides an
> address is correct, that a token has six decimals rather than eighteen, or that a
> balance covers an amount. Those questions have exact answers, and answering them
> probabilistically is how people lose money.
>
> So ZeFi splits the work. Interpretation is a language problem and gets a language
> model. Verification is an engineering problem and gets deterministic code: a curated
> chain and asset registry, EIP-55 checksum validation, BigInt arithmetic, an explicit
> status machine, and a local simulation layer that reports a check it could not run as
> skipped rather than passed.
>
> Between them sits a transaction plan — an artefact a person can read that states what
> ZeFi understood, what it assumed, what it will do, what it will cost, what it cannot
> do, and where every number came from. The plan is the product.
>
> ZeFi never requests or stores seed phrases or private keys. Connected wallets retain
> custody and sign transactions directly.

### Phrases to use

Ask. Plan. Execute onchain. · From intent to execution. · Understand before you sign. ·
Every action, explained. · Every route, verified. · Your wallet remains in control. ·
Intelligence before execution. · Human intent. Machine planning. User approval. ·
Routefold — A ZeFi company.

### Words never to use

Revolutionary · game-changing · supercharge · seamless · effortless · ultimate ·
guaranteed returns · risk-free execution · autonomous money · AI-powered everything.

Each of those asks a reader to skip a question they should be asking.

### Required disclaimers

> ZeFi provides informational, technical, and transaction-planning tools. Outputs may
> contain incomplete assumptions and do not constitute financial, investment, legal,
> tax, compliance, or security-audit advice.

> ZeFi never requests or stores seed phrases or private keys. Connected wallets retain
> custody and sign transactions directly.

---

## Screenshot checklist

Capture at **1440 × 900**, `deviceScaleFactor: 2`, light theme, reduced motion off,
after a 2.5s settle so entrance animations have finished.

```bash
pnpm build && pnpm start &
pnpm exec tsx scripts/shoot.ts <name> <path> [--sel "#id"] [--full]
```

| # | Shot | Route / selector |
| --- | --- | --- |
| 1 | **Main hero** — headline, CTAs, embedded plan preview | `/` |
| 2 | **ZeFi Intelligence** — assistant conversation | `/` · `#intelligence` |
| 3 | **Transaction plan** — full interface with provenance | `/` · `#transaction-plan` |
| 4 | **Wallet intelligence** — allocation and reading | `/` · `#wallet-intelligence` |
| 5 | **Intent to execution** — the signature scroll visual | `/how-it-works` · `#intent-to-execution` |
| 6 | **Routefold** — dark plate with chain-fit scores | `/` · `#routefold` |
| 7 | **Safety and control** — the four pillars | `/` · `#safety` |
| 8 | **Application dashboard** — signed in, wallet connected | `/app` |

Shots 1–7 need no credentials. Shot 8 needs Clerk configured and a signed-in session.

### Before publishing any screenshot

- [ ] Every illustrative figure carries its **Illustrative** chip
- [ ] No real wallet address or transaction hash is visible
- [ ] No API key, connection string or session token in any panel
- [ ] The dev overlay is off (`devIndicators: false` — already set)
- [ ] Entrance animations have finished
