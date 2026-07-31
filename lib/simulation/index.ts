import 'server-only'

import { serverEnv } from '@/lib/config/env'
import type { SimulationResult } from '@/lib/planner/types'
import { LocalSimulationProvider } from './local'
import type { SimulationProvider, SimulationRequest } from './types'

export * from './types'
export { LocalSimulationProvider, compareDecimalStrings } from './local'

/**
 * Simulation provider resolution.
 *
 * When `SIMULATION_PROVIDER` is unset, ZeFi uses the local deterministic
 * validator and says so. When it is set to a name this build does not implement,
 * that is an error the operator must see — not a reason to quietly downgrade.
 */

const localProvider = new LocalSimulationProvider()

/** Providers this build knows how to construct. */
const KNOWN_PROVIDERS = new Set<string>([
  // Add adapters here as they are implemented. The adapter must only set
  // `deep: true` if it genuinely executes against chain state.
])

export function getSimulationProvider(): SimulationProvider {
  const configured = serverEnv.providers.simulation
  if (!configured) return localProvider

  if (!KNOWN_PROVIDERS.has(configured)) {
    throw new SimulationProviderError(
      `SIMULATION_PROVIDER is set to “${configured}”, which this build does not implement. Implement an adapter in lib/simulation, or unset the variable to use local validation only.`,
    )
  }

  // No adapters are shipped yet; the guard above makes that explicit.
  return localProvider
}

export class SimulationProviderError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SimulationProviderError'
  }
}

/**
 * Runs a simulation, converting provider failure into an explicit `unavailable`
 * result. It never substitutes local output for a failed deep simulation
 * without labelling it.
 */
export async function runSimulation(request: SimulationRequest): Promise<SimulationResult> {
  let provider: SimulationProvider
  try {
    provider = getSimulationProvider()
  } catch (error) {
    return unavailable(error instanceof Error ? error.message : 'Simulation provider misconfigured.')
  }

  try {
    return await provider.simulate(request)
  } catch (error) {
    return unavailable(
      `${provider.name} could not complete the simulation: ${error instanceof Error ? error.message : 'unknown error'}.`,
    )
  }
}

export function deepSimulationAvailable(): boolean {
  try {
    return getSimulationProvider().deep
  } catch {
    return false
  }
}

function unavailable(message: string): SimulationResult {
  return {
    status: 'unavailable',
    provider: 'none',
    deepSimulation: false,
    checks: [],
    balanceChanges: [],
    gasEstimate: null,
    performedAt: new Date().toISOString(),
    message,
  }
}
