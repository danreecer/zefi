import { describe, expect, it } from 'vitest'

import { HERO_PLAN, TRANSFER_PLAN } from '@/lib/demo/fixtures'
import {
  allowedTransitions,
  canTransition,
  InvalidPlanTransitionError,
  isSignable,
  isTerminalStatus,
  PLAN_STATUSES,
  PLAN_STATUS_LABELS,
  PLAN_STATUS_TONE,
  transition,
  type PlanStatus,
  type TransactionPlan,
} from '@/lib/planner/types'

describe('plan status machine', () => {
  it('labels and tones every status', () => {
    for (const status of PLAN_STATUSES) {
      expect(PLAN_STATUS_LABELS[status], status).toBeTruthy()
      expect(PLAN_STATUS_TONE[status], status).toBeTruthy()
    }
  })

  it('follows the happy path from draft to confirmed', () => {
    const path: PlanStatus[] = [
      'draft',
      'ready_to_simulate',
      'simulating',
      'simulation_passed',
      'ready_for_signature',
      'submitted',
      'confirmed',
    ]
    for (let i = 0; i < path.length - 1; i += 1) {
      const from = path[i] as PlanStatus
      const to = path[i + 1] as PlanStatus
      expect(canTransition(from, to), `${from} → ${to}`).toBe(true)
    }
  })

  it('refuses to skip simulation on the way to a signature', () => {
    expect(canTransition('draft', 'ready_for_signature')).toBe(false)
    expect(canTransition('ready_to_simulate', 'ready_for_signature')).toBe(false)
    expect(canTransition('missing_information', 'submitted')).toBe(false)
  })

  it('refuses to move backwards out of submitted', () => {
    expect(canTransition('submitted', 'draft')).toBe(false)
    expect(canTransition('submitted', 'ready_for_signature')).toBe(false)
    expect(canTransition('submitted', 'confirmed')).toBe(true)
    expect(canTransition('submitted', 'failed')).toBe(true)
  })

  it('treats confirmed, failed and cancelled as terminal', () => {
    for (const status of ['confirmed', 'failed', 'cancelled'] as const) {
      expect(isTerminalStatus(status), status).toBe(true)
      expect(allowedTransitions(status), status).toEqual([])
    }
  })

  it('lets a plan be cancelled from any non-terminal state', () => {
    for (const status of PLAN_STATUSES) {
      if (isTerminalStatus(status) || status === 'submitted') continue
      expect(canTransition(status, 'cancelled'), status).toBe(true)
    }
  })

  it('cannot cancel a transaction that is already in the mempool', () => {
    // ZeFi has no power to cancel a broadcast transaction, so the model must
    // not offer a state that implies otherwise.
    expect(canTransition('submitted', 'cancelled')).toBe(false)
  })

  describe('transition()', () => {
    it('returns a new plan with an updated timestamp', () => {
      const plan: TransactionPlan = { ...TRANSFER_PLAN, status: 'ready_to_simulate' }
      const next = transition(plan, 'simulating')
      expect(next.status).toBe('simulating')
      expect(next).not.toBe(plan)
      expect(plan.status).toBe('ready_to_simulate')
    })

    it('throws a descriptive error on an illegal move', () => {
      const plan: TransactionPlan = { ...TRANSFER_PLAN, status: 'draft' }
      expect(() => transition(plan, 'confirmed')).toThrow(InvalidPlanTransitionError)
      try {
        transition(plan, 'confirmed')
      } catch (error) {
        expect((error as Error).message).toContain('Draft')
        expect((error as Error).message).toContain('Confirmed')
      }
    })
  })
})

describe('isSignable', () => {
  it('accepts a ready plan with a wallet-signable action', () => {
    expect(isSignable(TRANSFER_PLAN)).toBe(true)
  })

  it('rejects a plan that is not at ready_for_signature', () => {
    expect(isSignable({ ...TRANSFER_PLAN, status: 'simulation_passed' })).toBe(false)
    expect(isSignable({ ...TRANSFER_PLAN, status: 'draft' })).toBe(false)
  })

  it('rejects a plan with outstanding blockers or missing fields', () => {
    expect(isSignable({ ...TRANSFER_PLAN, blockers: ['Recipient is a burn address.'] })).toBe(false)
    expect(isSignable({ ...TRANSFER_PLAN, missingInformation: ['recipient'] })).toBe(false)
  })

  it('rejects a plan whose every step needs a provider', () => {
    // The bridge fixture is the real case: fully planned, nothing signable.
    const forced = { ...HERO_PLAN, status: 'ready_for_signature' as const, missingInformation: [] }
    expect(isSignable(forced)).toBe(false)
  })
})

describe('fixtures', () => {
  it('marks every demo plan illustrative and sources it as such', () => {
    for (const plan of [HERO_PLAN, TRANSFER_PLAN]) {
      expect(plan.illustrative, plan.id).toBe(true)
      expect(plan.dataSources.some((source) => source.kind === 'illustrative'), plan.id).toBe(true)
    }
  })

  it('never claims a deep simulation it did not run', () => {
    for (const plan of [HERO_PLAN, TRANSFER_PLAN]) {
      expect(plan.simulation.deepSimulation, plan.id).toBe(false)
      expect(plan.simulation.provider, plan.id).toBe('local')
    }
  })

  it('never plans an unlimited approval', () => {
    for (const plan of [HERO_PLAN, TRANSFER_PLAN]) {
      for (const approval of plan.approvals) {
        expect(approval.unlimited, `${plan.id}/${approval.asset}`).toBe(false)
      }
    }
  })

  it('labels the confirm control with the real action', () => {
    expect(TRANSFER_PLAN.confirmationLabel).toBe('Review 250 USDC transfer')
    // A plan missing information must not offer a signature.
    expect(HERO_PLAN.confirmationLabel).toBe('Add the missing details')
    for (const plan of [HERO_PLAN, TRANSFER_PLAN]) {
      expect(plan.confirmationLabel.toLowerCase()).not.toContain('instantly')
      expect(plan.requiresExplicitConfirmation).toBe(true)
    }
  })
})
