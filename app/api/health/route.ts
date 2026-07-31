import { describeCapabilities } from '@/lib/config/env'
import { ok } from '@/lib/api/respond'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Deployment self-report.
 *
 * Returns what this instance can actually do. Deliberately exposes no secrets —
 * only whether each capability is configured — so it is safe to leave public and
 * useful for verifying a deployment before pointing a domain at it.
 */
export async function GET() {
  return ok({
    service: 'zefi',
    status: 'ok',
    capabilities: describeCapabilities(),
  })
}
