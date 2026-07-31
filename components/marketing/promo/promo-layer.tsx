'use client'

import { useCallback, useState } from 'react'

import type { CapabilityKey } from '@/lib/content/promos'
import { FeatureTicker } from './feature-ticker'
import { LaunchDialog } from './launch-dialog'
import { SocialRail } from './social-rail'
import { StickyDock } from './sticky-dock'

/**
 * Orchestrates the promotional surfaces.
 *
 * The point of a single layer rather than scattered components is that only one
 * thing may interrupt at a time. When the dialog opens, the dock and the ticker
 * stand down; they come back when it closes. Without that rule these surfaces
 * are individually reasonable and collectively a wall.
 *
 * `enabled` comes from the server's real capability report, so the ticker can
 * only promote what this deployment actually does. The announcement bar is not
 * here — it lives in normal flow at the top of the layout, because it pushes
 * content rather than covering it.
 */
export function PromoLayer({ enabled }: { enabled: CapabilityKey[] }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const onOpenChange = useCallback((open: boolean) => setDialogOpen(open), [])

  return (
    <>
      <SocialRail />
      <StickyDock suppressed={dialogOpen} />
      <FeatureTicker enabled={new Set(enabled)} suppressed={dialogOpen} />
      <LaunchDialog onOpenChange={onOpenChange} />
    </>
  )
}
