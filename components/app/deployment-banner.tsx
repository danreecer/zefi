import { Info } from 'lucide-react'
import Link from 'next/link'

import type { Capabilities } from '@/lib/config/env'

/**
 * The deployment-state banner.
 *
 * Every degraded capability is named where the user will see it, rather than
 * discovered when something quietly does not work. If everything is configured,
 * nothing renders.
 */
export function DeploymentBanner({ capabilities }: { capabilities: Capabilities }) {
  const notices: string[] = []

  if (capabilities.ai === 'demo') {
    notices.push(
      'No AI provider is configured, so replies come from ZeFi’s deterministic engine rather than a model.',
    )
  } else if (capabilities.ai === 'unavailable') {
    notices.push('No AI provider is configured and demo mode is off — the assistant will return an error.')
  }

  if (capabilities.persistence === 'ephemeral') {
    notices.push('No database is configured, so conversations and plans are not saved between requests.')
  }

  if (capabilities.execution === 'disabled') {
    notices.push('Execution is switched off, so ZeFi will plan and simulate but never request a signature.')
  }

  if (capabilities.deepSimulation === 'local-only') {
    notices.push('Deep simulation is not configured — plans get local deterministic validation only.')
  }

  if (notices.length === 0) return null

  return (
    <div className="border-b border-caution/20 bg-caution-soft/70 px-4 py-3 sm:px-6">
      <div className="flex gap-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-caution" aria-hidden="true" />
        <div className="min-w-0">
          <p className="label-tech-sm text-caution">Deployment state</p>
          <ul className="mt-1.5 space-y-1">
            {notices.map((notice) => (
              <li key={notice} className="text-[0.8125rem] leading-relaxed text-ink-soft">
                {notice}
              </li>
            ))}
          </ul>
          <Link
            href="/docs#environment"
            className="link-underline mt-2 inline-block text-[0.75rem] text-ink"
          >
            Configuration reference
          </Link>
        </div>
      </div>
    </div>
  )
}
