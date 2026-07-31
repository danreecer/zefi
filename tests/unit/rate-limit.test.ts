import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  __resetRateLimits,
  checkMutationLimit,
  checkRateLimit,
  rateLimitHeaders,
} from '@/lib/security/rate-limit'

describe('checkRateLimit', () => {
  beforeEach(() => {
    __resetRateLimits()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows up to the limit and then refuses', () => {
    for (let i = 0; i < 3; i += 1) {
      expect(checkRateLimit('user-a', 3, 60_000).allowed, `call ${i}`).toBe(true)
    }
    const blocked = checkRateLimit('user-a', 3, 60_000)
    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('counts down remaining accurately', () => {
    expect(checkRateLimit('user-b', 3, 60_000).remaining).toBe(2)
    expect(checkRateLimit('user-b', 3, 60_000).remaining).toBe(1)
    expect(checkRateLimit('user-b', 3, 60_000).remaining).toBe(0)
  })

  it('keeps buckets separate per key', () => {
    checkRateLimit('user-c', 1, 60_000)
    expect(checkRateLimit('user-c', 1, 60_000).allowed).toBe(false)
    expect(checkRateLimit('user-d', 1, 60_000).allowed).toBe(true)
  })

  it('resets once the window elapses', () => {
    checkRateLimit('user-e', 1, 60_000)
    expect(checkRateLimit('user-e', 1, 60_000).allowed).toBe(false)

    vi.advanceTimersByTime(60_001)
    expect(checkRateLimit('user-e', 1, 60_000).allowed).toBe(true)
  })

  it('exposes a reset time in the future while limited', () => {
    const first = checkRateLimit('user-f', 1, 60_000)
    expect(first.resetAt).toBeGreaterThan(Date.now())
  })

  it('caps mutations at sixty a minute', () => {
    for (let i = 0; i < 60; i += 1) checkMutationLimit('user-g')
    expect(checkMutationLimit('user-g').allowed).toBe(false)
  })
})

describe('rateLimitHeaders', () => {
  it('omits Retry-After while a request is still allowed', () => {
    const headers = rateLimitHeaders({
      allowed: true,
      remaining: 5,
      limit: 10,
      resetAt: Date.now() + 60_000,
      retryAfterSeconds: 0,
    })
    expect(headers['X-RateLimit-Limit']).toBe('10')
    expect(headers['X-RateLimit-Remaining']).toBe('5')
    expect(headers['Retry-After']).toBeUndefined()
  })

  it('includes Retry-After once refused', () => {
    const headers = rateLimitHeaders({
      allowed: false,
      remaining: 0,
      limit: 10,
      resetAt: Date.now() + 30_000,
      retryAfterSeconds: 30,
    })
    expect(headers['Retry-After']).toBe('30')
  })
})
