import type { SimulationCheck, SimulationResult, TransactionPlan } from '@/lib/planner/types'

export interface TokenBalanceReading {
  chainKey: string
  symbol: string
  /** Decimal string. */
  amount: string
  decimals: number
  address: string | null
  /** When this reading was taken. Displayed next to every derived figure. */
  readAt: string
}

export interface SimulationRequest {
  plan: TransactionPlan
  wallet: { address: string | null; chainId: number | null }
  /** Real balance readings. Absent means the balance checks are skipped, not passed. */
  balances?: TokenBalanceReading[]
}

/**
 * The contract every simulation backend implements.
 *
 * `deep` is the honesty flag. A provider may only set it true if it actually
 * executes the transaction against chain state. The local provider never does.
 */
export interface SimulationProvider {
  readonly name: string
  readonly deep: boolean
  simulate(request: SimulationRequest): Promise<SimulationResult>
}

export function check(
  id: string,
  label: string,
  outcome: SimulationCheck['outcome'],
  detail: string,
): SimulationCheck {
  return { id, label, outcome, detail }
}

/** Rolls individual check outcomes into an overall status. */
export function summariseChecks(checks: SimulationCheck[], deep: boolean): SimulationResult['status'] {
  if (checks.some((c) => c.outcome === 'fail')) return 'failed'
  if (checks.some((c) => c.outcome === 'warn')) return 'warning'
  return deep ? 'passed' : 'local_only'
}

/**
 * The sentence shown next to a simulation result. Deliberately centralised so
 * no surface in the product can describe a local check as a full simulation.
 */
export function describeSimulation(result: SimulationResult): string {
  switch (result.status) {
    case 'not_run':
      return 'Not run yet.'
    case 'running':
      return 'Running…'
    case 'local_only':
      return 'Local validation passed. Deep simulation is not configured, so this transaction has not been executed against chain state.'
    case 'passed':
      return result.deepSimulation
        ? `Executed against chain state by ${result.provider}. No revert detected.`
        : 'Local validation passed. No deep simulation was performed.'
    case 'warning':
      return result.deepSimulation
        ? `${result.provider} completed the simulation with warnings.`
        : 'Local validation completed with warnings. Deep simulation was not performed.'
    case 'failed':
      return result.deepSimulation
        ? `${result.provider} reported that this transaction would fail.`
        : 'Local validation failed. This plan cannot proceed as written.'
    case 'unavailable':
      return 'The configured simulation provider could not be reached. ZeFi has not verified this transaction.'
    default:
      return 'Unknown simulation state.'
  }
}

/** True only when the result represents a genuine against-state execution. */
export function isFullySimulated(result: SimulationResult): boolean {
  return result.deepSimulation && (result.status === 'passed' || result.status === 'warning')
}
