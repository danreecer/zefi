# Transaction safety

What ZeFi will sign, what it will not, and why the difference is structural rather
than a matter of policy.

---

## The custody position

**ZeFi never requests or stores seed phrases or private keys. Connected wallets retain
custody and sign transactions directly.**

This is not a promise about conduct. There is no wallet client with a private key
anywhere in the codebase, no server route that accepts key material, and no signing
path on the server at all. `lib/wallet/server-reads.ts` constructs a viem
`PublicClient` and nothing else — a public client cannot sign.

Signing happens in `components/app/plan/approval-flow.tsx`, in the browser, through
wagmi, in the user's own wallet.

---

## What ZeFi can execute today

| Action | Status | Notes |
| --- | --- | --- |
| Native-currency transfer | Supported | Ethereum, Base, Arbitrum, OP Mainnet, Polygon |
| ERC-20 transfer | Supported | Registry tokens only |
| Exact-amount ERC-20 approval | Supported | Only as a step within a plan |
| Swap | **Plan only** | Needs `SWAP_PROVIDER` |
| Bridge | **Plan only** | Needs `BRIDGE_PROVIDER` |
| Arbitrary contract call | **Never** | ZeFi decodes and explains; it does not execute |
| Anything on Solana | **Plan only** | No Solana wallet connection exists |

Everything is additionally gated by `TRANSACTION_EXECUTION_ENABLED`. When false, ZeFi
builds and validates plans but never requests a signature, and the confirm control
says so.

### What "plan only" means concretely

ZeFi builds the full plan, resolves every reference, runs local validation, produces
the risk register, and shows the ordered steps. Then the step is marked
`provider_required` with the exact environment variable that would enable it, and the
confirm control reads **"Provider integration required"**.

It does not produce calldata. It does not show a success state. It does not estimate a
fee it cannot source.

---

## The approval flow

1. User request, stored verbatim
2. Intent extraction (model, Zod-validated)
3. Missing-field resolution
4. Plan construction (deterministic)
5. Risk review (deterministic)
6. Simulation
7. Human-readable summary
8. **Explicit user confirmation**
9. Wallet signature
10. Submission
11. Status monitoring
12. Final receipt

Step 8 is a separate dialog, not a checkbox. It restates the four fields a person
actually needs to re-read — network, asset, amount, recipient — and repeats every
non-informational risk.

### The confirm control

The label always names the real action:

- ✅ `Review 250 USDC transfer`
- ✅ `Review 2,000 USDC bridge`
- ✅ `Request wallet signature`
- ✅ `Execution disabled in this deployment`
- ✅ `Provider integration required`
- ✅ `Resolve the blockers above`
- ❌ `Execute instantly`

`tests/unit/planner.test.ts` asserts that no generated label contains the word
"instant", for every intent type.

---

## Deterministic guarantees

### Addresses

Every recipient passes `validateEvmAddress`, which:

- rejects malformed input
- returns the EIP-55 checksummed form
- rejects known burn addresses (`0x0…0`, `0x…dEaD`)
- rejects a transfer to the connected wallet itself
- refuses to treat a name (`vitalik.eth`) as an address — name resolution is a
  network read with its own failure modes, and is reported as unresolved rather than
  silently skipped

### Amounts

Amounts never pass through a JavaScript float. They are validated as decimal strings
against the asset's real decimal count, then converted with `BigInt`:

```ts
toBaseUnits('0.1', 18) + toBaseUnits('0.2', 18) === toBaseUnits('0.3', 18)  // exact
```

An amount with more precision than the asset supports is rejected, not truncated.

### Approvals

ZeFi plans **exact-amount approvals only**. `approvalFor()` hardcodes
`unlimited: false`, and the local simulator *fails* any plan containing an unlimited
approval. Unlimited approvals are only ever *reported* — when found in a transaction a
user brought to ZeFi from elsewhere.

### USD amounts

A dollar amount on a stablecoin resolves 1:1. A dollar amount on a volatile asset is a
**blocker**, not an estimate:

> Converting a US-dollar amount into ETH needs a live price. ZeFi will not estimate
> one — specify the amount in ETH, or connect a pricing provider.

### Gas reserve

If an action would leave less than a per-chain reserve of native currency, the plan
carries a `GAS_RESERVE_LOW` caution — including the observation that you would no
longer be able to afford to move the funds back.

---

## Simulation honesty

Two things are always distinguishable:

- **`deepSimulation: true`** — a provider executed the transaction against chain state
- **`deepSimulation: false`** — local deterministic validation only

`summariseChecks()` cannot return `passed` for a shallow run; it returns `local_only`.
`describeSimulation()` is the single place that renders a simulation into prose, so no
surface in the product can describe a local check as a full simulation.

A check that could not run reports **`skipped`**, never `pass`. Absent a balance
reading, the balance check says:

> No live balance reading is available, so ZeFi has not verified that this amount is
> spendable.

Local validation covers: chain support, wallet/network agreement, recipient validity,
asset resolution, amount representability, balance sufficiency, approval scope, and
whether every step can be encoded.

---

## Idempotency

A submitted transaction is recorded under two independent uniqueness constraints —
`(chainId, transactionHash)` and `(userId, idempotencyKey)` — plus a pre-check and a
`P2002` race handler. A retry after a dropped response returns the existing record with
`created: false` rather than writing a second row.

The client generates the idempotency key once per approval dialog, so a double-click
cannot become a double-record.

---

## The status machine

Eleven states with explicit transitions. Two properties are worth calling out:

- `draft → ready_for_signature` is **not** a legal transition. Simulation cannot be
  skipped on the way to a signature.
- `submitted → cancelled` is **not** a legal transition. ZeFi cannot cancel a
  transaction in the mempool, so no state implies that it can.

`isSignable()` additionally requires zero blockers, zero missing fields, and at least
one action the wallet can actually sign.

---

## Failure behaviour

| Failure | What the user sees |
| --- | --- |
| AI provider errors | An error naming the provider. Never a fixture. |
| Model returns invalid structure | One repair attempt, then an error. Never a guessed object. |
| RPC read fails | The failure, named per chain. Never a zero. |
| Gas estimate fails | "Not established". Never an invented figure. |
| Simulation provider unreachable | `unavailable` — "ZeFi has not verified this transaction." |
| Wallet rejects | "You rejected the request in your wallet." |
| Transaction submits but recording fails | A warning that it is onchain regardless. |
| Any page crashes | "Nothing was submitted onchain and no transaction was signed." |

---

## What ZeFi does not claim

- It has **not** been independently audited.
- Local validation **cannot** prove a transaction will not revert.
- Estimates depend on conditions at submission, not at planning.
- A country-code domain is an address, not a licence. ZeFi holds no financial-services
  registration in any jurisdiction.
