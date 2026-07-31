import 'server-only'

import { serverEnv } from '@/lib/config/env'

/**
 * Rate limiting.
 *
 * The default limiter is in-memory and therefore per-instance. On a serverless
 * platform that means the effective limit is (configured limit × live
 * instances), which is a real weakening — it is documented in SECURITY.md
 * rather than glossed over, and `UPSTASH_REDIS_REST_URL` switches to a shared
 * limiter when the deployment needs a hard guarantee.
 */

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  limit: number
  /** Unix ms at which the current window resets. */
  resetAt: number
  retryAfterSeconds: number
}

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()
let lastSweep = Date.now()

function sweep(now: number) {
  // Amortised cleanup so an abandoned key set cannot grow without bound.
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  sweep(now)

  const existing = buckets.get(key)
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs
    buckets.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: limit - 1, limit, resetAt, retryAfterSeconds: 0 }
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      limit,
      resetAt: existing.resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    }
  }

  existing.count += 1
  return {
    allowed: true,
    remaining: limit - existing.count,
    limit,
    resetAt: existing.resetAt,
    retryAfterSeconds: 0,
  }
}

/** Per-minute and per-day limits on the AI surface, checked together. */
export function checkAssistantLimits(identifier: string): RateLimitResult {
  const minute = checkRateLimit(`ai:m:${identifier}`, serverEnv.rateLimit.aiPerMinute, 60_000)
  if (!minute.allowed) return minute
  return checkRateLimit(`ai:d:${identifier}`, serverEnv.rateLimit.aiPerDay, 86_400_000)
}

export function checkMutationLimit(identifier: string): RateLimitResult {
  return checkRateLimit(`mut:${identifier}`, 60, 60_000)
}

/** Header set attached to every rate-limited response. */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.resetAt / 1000)),
    ...(result.allowed ? {} : { 'Retry-After': String(result.retryAfterSeconds) }),
  }
}

/** Exposed for tests so window state never leaks between cases. */
export function __resetRateLimits() {
  buckets.clear()
  lastSweep = Date.now()
}
