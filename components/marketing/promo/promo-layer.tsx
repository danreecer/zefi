'use client'

import { useCallback, useEffect, useState } from 'react'

import type { CapabilityKey } from '@/lib/content/promos'
import { BackToTop } from './back-to-top'
import { FeatureTicker } from './feature-ticker'
import { LaunchDialog } from './launch-dialog'
import { SocialRail } from './social-rail'
import { StickyDock } from './sticky-dock'
import { useDismissable } from './use-promo-state'

/** Past the hero, roughly — where a second call to action stops covering the first. */
const REVEAL_AT = 720

/**
 * Orchestrates the floating surfaces.
 *
 * The point of a single layer rather than scattered components is that only one
 * thing may interrupt at a time. When the dialog opens, the dock and the ticker
 * stand down; they come back when it closes. Without that rule these surfaces
 * are individually reasonable and collectively a wall.
 *
 * Scroll position is read once here rather than in each component, so the dock
 * and the back-to-top button agree on when they appear and the button knows to
 * lift above the dock instead of landing on it.
 *
 * `enabled` comes from the server's real capability report, so the ticker can
 * only promote what this deployment actually does.
 */
export function PromoLayer({ enabled }: { enabled: CapabilityKey[] }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [dockDismissed, dismissDock] = useDismissable('dock')

  const onOpenChange = useCallback((open: boolean) => setDialogOpen(open), [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > REVEAL_AT)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const dockVisible = scrolled && !dockDismissed && !dialogOpen

  return (
    <>
      <SocialRail />
      <StickyDock visible={dockVisible} onDismiss={dismissDock} />
      <BackToTop visible={scrolled && !dialogOpen} raised={dockVisible} />
      <FeatureTicker enabled={new Set(enabled)} suppressed={dialogOpen} />
      <LaunchDialog onOpenChange={onOpenChange} />
    </>
  )
}
