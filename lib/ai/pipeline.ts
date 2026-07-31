import 'server-only'

import { getChain, getChainById } from '@/lib/chains/registry'
import { describeCapabilities, serverEnv } from '@/lib/config/env'
import { classifyIntent, extractIntentFields } from '@/lib/intent/classify'
import { nextQuestion, resolveIntent, type WalletContext } from '@/lib/intent/resolve'
import {
  isTransactionalIntent,
  ModelIntentSchema,
  StructuredIntentSchema,
  type IntentType,
  type StructuredIntent,
} from '@/lib/intent/schema'
import { buildPlan } from '@/lib/planner/build'
import type { TransactionPlan } from '@/lib/planner/types'
import { getBridgeProvider, getSwapProvider } from '@/lib/providers'
import { sanitiseForPrompt } from '@/lib/security/validation'
import { deepSimulationAvailable, runSimulation } from '@/lib/simulation'
import { readChainBalances, toBalanceReadings } from '@/lib/wallet/server-reads'
import { AiUnavailableError, aiConfigured, generateStructured, generateText } from './client'
import {
  CONVERSATION_PROMPT,
  INTENT_EXTRACTION_PROMPT,
  PLAN_EXPLANATION_PROMPT,
  wrapUntrusted,
} from './prompts/system'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * THE ZEFI PIPELINE
 *
 *   1  Classify the request                       deterministic
 *   2  Extract structured intent                  model, Zod-validated
 *   3  Determine missing information              deterministic
 *   4  Retrieve permitted wallet context          onchain reads
 *   5  Construct an action plan or an answer      deterministic / model
 *   6  Deterministic validation                   local simulation
 *   7  Generate the human-readable explanation    model
 *   8  Present for review                         returned to the caller
 *
 * Stages 2 and 7 are the only ones a model touches. Between them sits every
 * value that could reach a transaction, and none of those values originate in
 * a model response.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type TurnMode = 'ai' | 'deterministic'

export interface Notice {
  kind: 'info' | 'caution' | 'critical'
  code: string
  message: string
}

export interface AssistantTurn {
  message: string
  intent: StructuredIntent
  plan: TransactionPlan | null
  followUpQuestion: string | null
  mode: TurnMode
  notices: Notice[]
  stages: StageRecord[]
  capabilities: ReturnType<typeof describeCapabilities>
}

export interface StageRecord {
  stage: number
  name: string
  outcome: 'ok' | 'skipped' | 'degraded' | 'failed'
  detail?: string
  durationMs: number
}

export interface TurnInput {
  message: string
  wallet: { address: string | null; chainId: number | null }
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
  knownRecipients?: string[]
}

export async function runAssistantTurn(input: TurnInput): Promise<AssistantTurn> {
  const stages: StageRecord[] = []
  const notices: Notice[] = []
  const capabilities = describeCapabilities()
  const message = sanitiseForPrompt(input.message)

  const walletContext: WalletContext = {
    address: input.wallet.address,
    chainId: input.wallet.chainId,
    chainKey: getChainById(input.wallet.chainId)?.key ?? null,
  }

  if (input.wallet.chainId && !walletContext.chainKey) {
    notices.push({
      kind: 'caution',
      code: 'UNSUPPORTED_NETWORK',
      message: `Your wallet is on chain id ${input.wallet.chainId}, which is not in ZeFi's registry. Switch to a supported network for wallet-aware answers.`,
    })
  }

  /* ── Stage 1 · Classify ──────────────────────────────────────────────── */
  const classification = await timed(stages, 1, 'Classify request', async () => {
    const result = classifyIntent(message)
    return { value: result, detail: `${result.intentType} · confidence ${result.confidence}` }
  })

  /* ── Stage 2 · Extract structured intent ─────────────────────────────── */
  let mode: TurnMode = 'deterministic'
  const intent = await timed(stages, 2, 'Extract structured intent', async () => {
    if (!aiConfigured()) {
      if (!serverEnv.flags.demoMode) {
        throw new AiUnavailableError(
          'ZeFi cannot interpret this request: no AI provider is configured on this deployment.',
          'not-configured',
        )
      }
      return {
        value: deterministicIntent(message, classification.intentType),
        outcome: 'degraded' as const,
        detail: 'No AI provider configured; deterministic extraction used (demo mode).',
      }
    }

    try {
      const raw = await generateStructured({
        system: INTENT_EXTRACTION_PROMPT,
        schema: ModelIntentSchema,
        toolName: 'record_intent',
        toolDescription: "Record the user's intent as structured fields.",
        messages: [
          {
            role: 'user',
            content: `Deterministic pre-classification suggests: ${classification.intentType} (confidence ${classification.confidence}). Chains mentioned: ${classification.chainMentions.join(', ') || 'none'}. Assets mentioned: ${classification.assetMentions.join(', ') || 'none'}. Use this as a prior, and override it if the message clearly says otherwise.\n\n${wrapUntrusted(message)}`,
          },
        ],
      })
      mode = 'ai'
      return { value: normaliseModelIntent(raw, message), detail: `${raw.intentType} · confidence ${raw.confidence}` }
    } catch (error) {
      // A configured-but-failing provider is an error, never a silent fallback.
      throw error
    }
  })

  /* ── Stage 3 · Determine missing information ─────────────────────────── */
  const resolved = await timed(stages, 3, 'Resolve intent against registry', async () => {
    const result = resolveIntent(intent, walletContext)
    return {
      value: result,
      detail:
        result.missing.length || result.blockers.length
          ? `${result.missing.length} missing, ${result.blockers.length} blocker(s)`
          : 'complete',
    }
  })

  /* ── Stage 4 · Retrieve permitted wallet context ─────────────────────── */
  const walletData = await timed(stages, 4, 'Read wallet context', async () => {
    const needsWallet =
      intent.intentType === 'PORTFOLIO_QUERY' || isTransactionalIntent(intent.intentType)

    if (!needsWallet) return { value: null, outcome: 'skipped' as const, detail: 'Not required for this intent.' }
    if (!walletContext.address) {
      return { value: null, outcome: 'skipped' as const, detail: 'No wallet connected.' }
    }

    const chainKey = resolved.sourceChainKey ?? walletContext.chainKey
    if (!chainKey) return { value: null, outcome: 'skipped' as const, detail: 'No target chain resolved.' }

    const snapshot = await readChainBalances(walletContext.address, chainKey)
    if (snapshot.errors.length > 0) {
      notices.push({
        kind: 'caution',
        code: 'CHAIN_READ_PARTIAL',
        message: `Some balance reads failed: ${snapshot.errors.map((e) => e.reason).join(' ')} Figures that depend on them are shown as unavailable, not estimated.`,
      })
    }
    return {
      value: snapshot,
      outcome: snapshot.errors.length > 0 ? ('degraded' as const) : ('ok' as const),
      detail: `${chainKey} · ${snapshot.tokens.length + (snapshot.native ? 1 : 0)} balance(s)`,
    }
  })

  /* ── Stage 5 · Construct a plan, or answer directly ──────────────────── */
  let plan: TransactionPlan | null = null

  if (isTransactionalIntent(intent.intentType)) {
    plan = await timed(stages, 5, 'Construct transaction plan', async () => {
      const built = buildPlan(resolved, {
        request: message,
        walletAddress: walletContext.address,
        executionEnabled: serverEnv.flags.executionEnabled,
        deepSimulationAvailable: deepSimulationAvailable(),
        swapProviderConfigured: Boolean(safeProvider(getSwapProvider)),
        bridgeProviderConfigured: Boolean(safeProvider(getBridgeProvider)),
        nativeBalance: walletData?.native?.amount ?? null,
        knownRecipients: input.knownRecipients ?? [],
      })
      return { value: built, detail: `${built.actions.length} action(s) · ${built.status}` }
    })
  } else {
    stages.push({ stage: 5, name: 'Construct transaction plan', outcome: 'skipped', durationMs: 0, detail: 'Non-transactional intent.' })
  }

  /* ── Stage 6 · Deterministic validation ──────────────────────────────── */
  if (plan && plan.status === 'ready_to_simulate') {
    const currentPlan = plan
    const simulation = await timed(stages, 6, 'Validate and simulate', async () => {
      const result = await runSimulation({
        plan: currentPlan,
        wallet: input.wallet,
        balances: walletData ? toBalanceReadings([walletData]) : undefined,
      })
      return {
        value: result,
        outcome: result.status === 'failed' ? ('degraded' as const) : ('ok' as const),
        detail: `${result.provider} · ${result.status}`,
      }
    })

    plan = {
      ...plan,
      simulation,
      status:
        simulation.status === 'failed'
          ? 'missing_information'
          : simulation.status === 'warning'
            ? 'simulation_warning'
            : 'simulation_passed',
      updatedAt: new Date().toISOString(),
    }

    // Only a plan that cleared validation and has something signable advances.
    if (
      (plan.status === 'simulation_passed' || plan.status === 'simulation_warning') &&
      plan.actions.some((action) => action.executionMode === 'wallet_signature')
    ) {
      plan = { ...plan, status: 'ready_for_signature' }
    }
  } else {
    stages.push({
      stage: 6,
      name: 'Validate and simulate',
      outcome: 'skipped',
      durationMs: 0,
      detail: plan ? `Plan is ${plan.status}.` : 'No plan to validate.',
    })
  }

  /* ── Stage 7 · Human-readable explanation ────────────────────────────── */
  const text = await timed(stages, 7, 'Generate explanation', async () => {
    if (!aiConfigured()) {
      return {
        value: deterministicExplanation(intent, resolved, plan, walletData),
        outcome: 'degraded' as const,
        detail: 'No AI provider configured; template explanation used.',
      }
    }

    if (plan) {
      const value = await generateText({
        system: PLAN_EXPLANATION_PROMPT,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: `Here is the validated plan. Explain it.\n\n<plan_json>\n${JSON.stringify(planForModel(plan), null, 2)}\n</plan_json>\n\nThe user originally wrote:\n${wrapUntrusted(message)}`,
          },
        ],
      })
      return { value }
    }

    const value = await generateText({
      system: CONVERSATION_PROMPT,
      messages: [
        ...(input.history ?? []).slice(-8).map((turn) => ({
          role: turn.role,
          content: turn.role === 'user' ? wrapUntrusted(turn.content) : turn.content,
        })),
        {
          role: 'user' as const,
          content: `${walletContextBlock(walletData, walletContext)}\n\n${wrapUntrusted(message)}`,
        },
      ],
    })
    return { value }
  })

  /* ── Stage 8 · Present ───────────────────────────────────────────────── */
  stages.push({ stage: 8, name: 'Present for review', outcome: 'ok', durationMs: 0 })

  if (mode === 'deterministic' && serverEnv.flags.demoMode) {
    notices.push({
      kind: 'info',
      code: 'DEMO_MODE',
      message:
        'Demo mode. No AI provider is configured, so this reply comes from ZeFi’s deterministic engine rather than a model.',
    })
  }

  if (plan?.illustrative) {
    notices.push({
      kind: 'info',
      code: 'ILLUSTRATIVE',
      message: 'Every figure in this plan is a fixed example, not a live reading.',
    })
  }

  return {
    message: text,
    // The resolved intent, not the raw model output: it carries the registry
    // keys and the missing-field list the UI needs to ask a precise question.
    intent: resolved.intent,
    plan,
    followUpQuestion: nextQuestion(resolved),
    mode,
    notices,
    stages,
    capabilities,
  }
}

/* ── Support ───────────────────────────────────────────────────────────────── */

async function timed<T>(
  stages: StageRecord[],
  stage: number,
  name: string,
  run: () => Promise<{ value: T; outcome?: StageRecord['outcome']; detail?: string }>,
): Promise<T> {
  const started = Date.now()
  try {
    const { value, outcome = 'ok', detail } = await run()
    stages.push({ stage, name, outcome, detail, durationMs: Date.now() - started })
    return value
  } catch (error) {
    stages.push({
      stage,
      name,
      outcome: 'failed',
      detail: error instanceof Error ? error.message : 'unknown error',
      durationMs: Date.now() - started,
    })
    throw error
  }
}

function safeProvider<T>(get: () => T | null): T | null {
  try {
    return get()
  } catch {
    return null
  }
}

/** Maps loose model output onto the strict internal schema. */
function normaliseModelIntent(raw: unknown, message: string): StructuredIntent {
  const parsed = ModelIntentSchema.parse(raw)
  const intentType = normaliseIntentType(parsed.intentType)

  const amount =
    parsed.amountValue && /^\d+(\.\d+)?$/.test(parsed.amountValue.replace(/,/g, ''))
      ? {
          value: parsed.amountValue.replace(/,/g, ''),
          unit: normaliseAmountUnit(parsed.amountUnit),
        }
      : null

  return StructuredIntentSchema.parse({
    intentType,
    sourceNetwork: parsed.sourceNetwork ?? null,
    destinationNetwork: parsed.destinationNetwork ?? null,
    sourceAsset: parsed.sourceAsset ?? null,
    destinationAsset: parsed.destinationAsset ?? null,
    amount,
    recipient: parsed.recipient ?? null,
    slippageTolerancePercent: parsed.slippageTolerancePercent ?? null,
    priority: normalisePriority(parsed.priority),
    requiredApprovals: [],
    missingInformation: [],
    confidence: parsed.confidence,
    assumptions: parsed.assumptions ?? [],
    clarifyingQuestion: parsed.clarifyingQuestion ?? null,
    summary: parsed.summary.slice(0, 320) || message.slice(0, 200),
  })
}

function normaliseIntentType(value: string): IntentType {
  const upper = value.trim().toUpperCase()
  const known: IntentType[] = [
    'EXPLAIN',
    'PORTFOLIO_QUERY',
    'SEND',
    'SWAP',
    'BRIDGE',
    'APPROVE',
    'CONTRACT_INTERACTION',
    'COMPARE_ROUTES',
    'ROUTEFOLD_ANALYSIS',
    'UNKNOWN',
  ]
  return known.includes(upper as IntentType) ? (upper as IntentType) : 'UNKNOWN'
}

function normaliseAmountUnit(value: string | null | undefined): 'token' | 'usd' | 'percent' | 'max' {
  const lower = value?.trim().toLowerCase()
  if (lower === 'usd' || lower === 'percent' || lower === 'max' || lower === 'token') return lower
  return 'token'
}

function normalisePriority(value: string | null | undefined) {
  const lower = value?.trim().toLowerCase()
  return lower === 'safest' || lower === 'cheapest' || lower === 'fastest' || lower === 'balanced'
    ? lower
    : null
}

/** Deterministic extraction, used when no AI provider is configured. */
function deterministicIntent(message: string, fallbackType: IntentType): StructuredIntent {
  const fields = extractIntentFields(message)
  return StructuredIntentSchema.parse({
    intentType: fields.classification.intentType || fallbackType,
    sourceNetwork: fields.sourceNetwork,
    destinationNetwork: fields.destinationNetwork,
    sourceAsset: fields.sourceAsset,
    destinationAsset: fields.destinationAsset,
    amount: fields.amount,
    recipient: fields.recipient,
    slippageTolerancePercent: fields.slippageTolerancePercent,
    priority: fields.priority,
    requiredApprovals: [],
    missingInformation: [],
    confidence: fields.classification.confidence,
    assumptions: ['Interpreted by ZeFi’s deterministic engine; no language model was used.'],
    clarifyingQuestion: null,
    summary: message.slice(0, 200),
  })
}

/** Strips fields the model has no business seeing or repeating back. */
function planForModel(plan: TransactionPlan) {
  return {
    intentType: plan.intentType,
    interpretedIntent: plan.interpretedIntent,
    status: plan.status,
    illustrative: plan.illustrative,
    actions: plan.actions.map((action) => ({
      title: action.title,
      chain: getChain(action.chainKey)?.name ?? action.chainKey,
      executionMode: action.executionMode,
      providerRequirement: action.providerRequirement ?? null,
      asset: action.asset,
      amount: action.amount,
      recipient: action.recipient,
      functionSignature: action.functionSignature,
    })),
    estimates: plan.estimates,
    risks: plan.risks.map((risk) => ({ severity: risk.severity, title: risk.title, detail: risk.detail })),
    approvals: plan.approvals,
    simulation: {
      status: plan.simulation.status,
      provider: plan.simulation.provider,
      deepSimulation: plan.simulation.deepSimulation,
      message: plan.simulation.message,
    },
    missingInformation: plan.missingInformation,
    blockers: plan.blockers,
  }
}

function walletContextBlock(
  snapshot: Awaited<ReturnType<typeof readChainBalances>> | null,
  wallet: WalletContext,
): string {
  if (!wallet.address) {
    return '<wallet_context>No wallet is connected. You have no balance data for this user.</wallet_context>'
  }
  if (!snapshot) {
    return `<wallet_context>Wallet ${wallet.address} is connected on ${wallet.chainKey ?? 'an unrecognised network'}, but no balance read was performed for this turn.</wallet_context>`
  }
  const lines = [
    `Address: ${snapshot.address}`,
    `Network: ${getChain(snapshot.chainKey)?.name ?? snapshot.chainKey}`,
    `Read at: ${snapshot.readAt}`,
    snapshot.native ? `Native: ${snapshot.native.amount} ${snapshot.native.symbol}` : 'Native: read failed',
    ...snapshot.tokens.map((token) => `Token: ${token.amount} ${token.symbol}`),
    ...(snapshot.tokens.length === 0 ? ['No registry tokens with a non-zero balance on this network.'] : []),
    ...snapshot.errors.map((error) => `Read error: ${error.reason}`),
  ]
  return `<wallet_context>\nThese are real readings. Use only these figures and cite the read time.\n${lines.join('\n')}\n</wallet_context>`
}

/** Template explanation used when no model is available. */
function deterministicExplanation(
  intent: StructuredIntent,
  resolved: ReturnType<typeof resolveIntent>,
  plan: TransactionPlan | null,
  wallet: Awaited<ReturnType<typeof readChainBalances>> | null,
): string {
  if (plan) {
    const signable = plan.actions.filter((a) => a.executionMode === 'wallet_signature').length
    const blocked = plan.actions.filter((a) => a.executionMode === 'provider_required')
    const parts = [
      `ZeFi read this as: ${intent.summary}`,
      `The plan has ${plan.actions.length} step${plan.actions.length === 1 ? '' : 's'}. ${signable} can be signed by your wallet in this deployment.`,
      blocked.length > 0
        ? `${blocked.length} step${blocked.length === 1 ? '' : 's'} need a routing provider before ZeFi can build calldata: ${blocked.map((a) => a.title).join('; ')}.`
        : '',
      plan.estimates.networkCostNative
        ? `Estimated network cost: ${plan.estimates.networkCostNative} ${plan.estimates.networkCostSymbol}.`
        : 'Network cost has not been established — no gas estimate was available for this plan.',
      resolved.missing.length > 0 ? `Still needed: ${resolved.missing.join(', ')}.` : '',
      resolved.blockers.length > 0 ? resolved.blockers.join(' ') : '',
      'Nothing is submitted until you approve it and your wallet signs.',
    ]
    return parts.filter(Boolean).join('\n\n')
  }

  if (intent.intentType === 'PORTFOLIO_QUERY') {
    if (!wallet) {
      return 'No wallet is connected, so ZeFi has no balances to describe. Connect a wallet from the header and ask again.'
    }
    const rows = [
      wallet.native ? `${wallet.native.amount} ${wallet.native.symbol}` : null,
      ...wallet.tokens.map((token) => `${token.amount} ${token.symbol}`),
    ].filter(Boolean)
    return rows.length > 0
      ? `On ${getChain(wallet.chainKey)?.name ?? wallet.chainKey}, read at ${wallet.readAt}:\n\n${rows.map((row) => `- ${row}`).join('\n')}\n\nThese are the assets in ZeFi's verified registry with a non-zero balance. Other tokens may be present.`
      : `No registry assets with a non-zero balance were found on ${getChain(wallet.chainKey)?.name ?? wallet.chainKey}, read at ${wallet.readAt}.`
  }

  return [
    'No AI provider is configured on this deployment, so ZeFi cannot answer conceptual questions in this turn.',
    'Its deterministic layer is still fully available: intent parsing, plan construction, registry validation, risk analysis and local simulation all work without a model.',
    'Set OPENAI_API_KEY and OPENAI_MODEL to enable the conversational layer.',
  ].join(' ')
}
