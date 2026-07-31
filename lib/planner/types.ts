import type { IntentType, StructuredIntent } from '@/lib/intent/schema'

/**
 * The transaction-plan domain model.
 *
 * A plan is the artefact a user actually approves. It is built deterministically
 * from a resolved intent — the model writes the prose, never the numbers, the
 * addresses, or the status.
 */

export const PLAN_STATUSES = [
  'draft',
  'missing_information',
  'ready_to_simulate',
  'simulating',
  'simulation_passed',
  'simulation_warning',
  'ready_for_signature',
  'submitted',
  'confirmed',
  'failed',
  'cancelled',
] as const

export type PlanStatus = (typeof PLAN_STATUSES)[number]

export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  draft: 'Draft',
  missing_information: 'Missing information',
  ready_to_simulate: 'Ready to simulate',
  simulating: 'Simulating',
  simulation_passed: 'Simulation passed',
  simulation_warning: 'Simulation warning',
  ready_for_signature: 'Ready for signature',
  submitted: 'Submitted',
  confirmed: 'Confirmed',
  failed: 'Failed',
  cancelled: 'Cancelled',
}

export type StatusTone = 'neutral' | 'progress' | 'positive' | 'caution' | 'critical'

export const PLAN_STATUS_TONE: Record<PlanStatus, StatusTone> = {
  draft: 'neutral',
  missing_information: 'caution',
  ready_to_simulate: 'neutral',
  simulating: 'progress',
  simulation_passed: 'positive',
  simulation_warning: 'caution',
  ready_for_signature: 'progress',
  submitted: 'progress',
  confirmed: 'positive',
  failed: 'critical',
  cancelled: 'neutral',
}

/** How a given action can actually be carried out in this deployment. */
export type ExecutionMode =
  /** ZeFi can build the exact calldata and hand it to the wallet to sign. */
  | 'wallet_signature'
  /** ZeFi can describe the step but needs a routing provider to build it. */
  | 'provider_required'
  /** Informational only — no transaction is produced for this step. */
  | 'informational'

export type ActionKind = 'approve' | 'transfer' | 'swap' | 'bridge' | 'contract_call' | 'receive'

export interface PlanAction {
  index: number
  kind: ActionKind
  title: string
  description: string
  chainKey: string
  executionMode: ExecutionMode
  /** Set when `executionMode` is `provider_required`. */
  providerRequirement?: string
  asset: string | null
  amount: string | null
  /** Checksummed. Only ever populated from the registry or from user input. */
  contractAddress: string | null
  recipient: string | null
  functionSignature: string | null
  /** Estimated seconds for this step alone. */
  estimatedSeconds: number | null
}

export type RiskSeverity = 'info' | 'caution' | 'critical'

export interface RiskFinding {
  code: string
  severity: RiskSeverity
  title: string
  detail: string
}

export interface ApprovalRequirement {
  chainKey: string
  asset: string
  tokenAddress: string | null
  spenderLabel: string
  spenderAddress: string | null
  /** `null` when the amount depends on a route ZeFi has not fetched. */
  amount: string | null
  unlimited: boolean
}

/**
 * Where a number came from and when. Every figure shown next to a plan carries
 * one of these, so "estimated" and "illustrative" are never confusable.
 */
export interface DataSource {
  label: string
  kind: 'onchain' | 'provider' | 'registry' | 'derived' | 'illustrative'
  retrievedAt: string
  detail?: string
}

export interface PlanEstimates {
  /** Native-currency cost, as a decimal string. `null` when not estimated. */
  networkCostNative: string | null
  networkCostSymbol: string | null
  networkCostUsd: number | null
  slippagePercent: number | null
  estimatedSeconds: number | null
  /** True when any figure above could not be established from a real source. */
  incomplete: boolean
}

export type SimulationStatus =
  | 'not_run'
  | 'running'
  | 'local_only'
  | 'passed'
  | 'warning'
  | 'failed'
  | 'unavailable'

export interface SimulationCheck {
  id: string
  label: string
  outcome: 'pass' | 'warn' | 'fail' | 'skipped'
  detail: string
}

export interface SimulationResult {
  status: SimulationStatus
  /** `'local'` or the configured provider's name. Never fabricated. */
  provider: string
  /** True only when a provider actually executed the transaction against state. */
  deepSimulation: boolean
  checks: SimulationCheck[]
  balanceChanges: BalanceChange[]
  gasEstimate: string | null
  performedAt: string | null
  message: string
}

export interface BalanceChange {
  chainKey: string
  asset: string
  direction: 'increase' | 'decrease'
  amount: string
  /** `true` when derived from the plan rather than observed in a simulation. */
  projected: boolean
}

export interface TransactionPlan {
  id: string
  /** The user's message, stored verbatim. */
  request: string
  intentType: IntentType
  /** ZeFi's restatement of what it understood. */
  interpretedIntent: string
  intent: StructuredIntent
  actions: PlanAction[]
  estimates: PlanEstimates
  risks: RiskFinding[]
  approvals: ApprovalRequirement[]
  simulation: SimulationResult
  dataSources: DataSource[]
  status: PlanStatus
  /** Always true. Present so the contract is explicit rather than implied. */
  requiresExplicitConfirmation: true
  /** The exact label the confirm control must carry. */
  confirmationLabel: string
  missingInformation: string[]
  blockers: string[]
  createdAt: string
  updatedAt: string
  /** Set when every figure in the plan is a fixture rather than a real read. */
  illustrative: boolean
}

/* ── Status machine ────────────────────────────────────────────────────────── */

const TRANSITIONS: Record<PlanStatus, PlanStatus[]> = {
  draft: ['missing_information', 'ready_to_simulate', 'cancelled'],
  missing_information: ['draft', 'ready_to_simulate', 'cancelled'],
  ready_to_simulate: ['simulating', 'missing_information', 'cancelled'],
  simulating: ['simulation_passed', 'simulation_warning', 'failed', 'cancelled'],
  simulation_passed: ['ready_for_signature', 'missing_information', 'cancelled'],
  simulation_warning: ['ready_for_signature', 'missing_information', 'cancelled'],
  ready_for_signature: ['submitted', 'cancelled', 'failed'],
  submitted: ['confirmed', 'failed'],
  // Terminal.
  confirmed: [],
  failed: [],
  cancelled: [],
}

export function canTransition(from: PlanStatus, to: PlanStatus): boolean {
  return TRANSITIONS[from].includes(to)
}

export function allowedTransitions(from: PlanStatus): PlanStatus[] {
  return [...TRANSITIONS[from]]
}

export function isTerminalStatus(status: PlanStatus): boolean {
  return TRANSITIONS[status].length === 0
}

export class InvalidPlanTransitionError extends Error {
  constructor(
    public readonly from: PlanStatus,
    public readonly to: PlanStatus,
  ) {
    super(`Cannot move a transaction plan from “${PLAN_STATUS_LABELS[from]}” to “${PLAN_STATUS_LABELS[to]}”.`)
    this.name = 'InvalidPlanTransitionError'
  }
}

/** The only supported way to change a plan's status. */
export function transition(plan: TransactionPlan, to: PlanStatus): TransactionPlan {
  if (!canTransition(plan.status, to)) {
    throw new InvalidPlanTransitionError(plan.status, to)
  }
  return { ...plan, status: to, updatedAt: new Date().toISOString() }
}

/**
 * A plan may only be signed once it has cleared validation, has no critical
 * risk left unacknowledged, and has at least one action the wallet can sign.
 */
export function isSignable(plan: TransactionPlan): boolean {
  if (plan.status !== 'ready_for_signature') return false
  if (plan.blockers.length > 0) return false
  if (plan.missingInformation.length > 0) return false
  return plan.actions.some((action) => action.executionMode === 'wallet_signature')
}
