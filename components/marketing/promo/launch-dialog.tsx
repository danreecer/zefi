'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { ArrowRight, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { FOUNDER_SOCIAL, PRODUCT_HUNT } from '@/lib/content/promos'
import { useDismissable } from './use-promo-state'

/**
 * The launch dialog.
 *
 * Deliberately the least frequent surface here: it opens once, on exit intent
 * or after a long dwell, and never again once closed. Closing it counts as
 * dismissal — an interstitial that reappears on the next page view is the
 * behaviour people install blockers for.
 *
 * It carries the two things worth interrupting for: the Product Hunt listing
 * and the founder, both of which are real and both of which are checkable.
 */

const DWELL_MS = 45_000
/**
 * Exit intent stays disarmed for this long after load.
 *
 * Without it the dialog fires the instant someone arrives: a visitor who
 * clicked through from another tab has their pointer up in the browser chrome
 * already, so the very first `mouseleave` lands before they have read a word.
 * Exit intent is only meaningful once there is something to exit from.
 */
const ARM_EXIT_INTENT_MS = 25_000

export function LaunchDialog({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const [dismissed, dismiss] = useDismissable('launch-dialog')
  const [open, setOpen] = useState(false)
  const [hasOpened, setHasOpened] = useState(false)

  useEffect(() => {
    if (dismissed) return

    const trigger = () => {
      setOpen(true)
      setHasOpened(true)
    }
    const timers = [setTimeout(trigger, DWELL_MS)]

    // Exit intent: pointer leaving through the top of the viewport, which is
    // the tab bar. Desktop only by nature — touch devices never fire it.
    let armed = false
    timers.push(
      setTimeout(() => {
        armed = true
      }, ARM_EXIT_INTENT_MS),
    )

    const onLeave = (event: MouseEvent) => {
      if (armed && event.clientY <= 0) trigger()
    }
    document.addEventListener('mouseleave', onLeave)

    return () => {
      timers.forEach(clearTimeout)
      document.removeEventListener('mouseleave', onLeave)
    }
  }, [dismissed])

  useEffect(() => {
    onOpenChange(open)
  }, [open, onOpenChange])

  // Only skip rendering for someone who dismissed this on an earlier visit.
  // Closing it *now* also marks it dismissed, and unmounting Dialog.Root in the
  // same commit would race Radix's own teardown — the scroll lock and the
  // pointer-events guard it puts on the body are removed by that teardown, so
  // losing it leaves the page unscrollable. Staying mounted costs nothing.
  if (dismissed && !hasOpened) return null

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) dismiss()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/35 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[22px] border border-[rgba(23,19,15,0.1)] bg-ivory shadow-[var(--shadow-panel)] focus:outline-none">
          <div className="ambient-soft relative px-7 pt-7 pb-6">
            <Dialog.Close
              aria-label="Close"
              className="absolute top-4 right-4 rounded-full p-1.5 text-ink-soft/60 transition-colors hover:bg-white/60 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-600"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>

            <span className="chip chip-ember">
              <span className="inline-block h-1.5 w-1.5 animate-pulse-soft rounded-full bg-ember-600" />
              Live · open to everyone
            </span>

            <Dialog.Title className="mt-4 font-display text-[1.75rem] leading-[1.1] tracking-tight text-ink">
              We just launched on Product Hunt
            </Dialog.Title>
            <Dialog.Description className="mt-2.5 text-[0.9375rem] leading-relaxed text-ink-soft">
              ZeFi turns a sentence into a transaction plan you can actually read — the route, the
              approvals, the risks and the cost — before anything reaches your wallet.
            </Dialog.Description>

            <a
              href={PRODUCT_HUNT.post}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-5 inline-block rounded-[10px] transition-opacity duration-300 hover:opacity-80"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={PRODUCT_HUNT.badge} alt={PRODUCT_HUNT.label} width={250} height={54} />
            </a>
          </div>

          <div className="border-t border-[rgba(23,19,15,0.09)] bg-white px-7 py-5">
            <div className="flex items-center gap-3">
              <Image
                src={FOUNDER_SOCIAL.photo}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.875rem] font-medium text-ink">{FOUNDER_SOCIAL.name}</p>
                <p className="truncate text-[0.8125rem] text-ink-soft">{FOUNDER_SOCIAL.blurb}</p>
              </div>
              <a
                href={FOUNDER_SOCIAL.href}
                target="_blank"
                rel="noreferrer noopener"
                className="btn btn-paper shrink-0 text-[0.8125rem]"
              >
                {FOUNDER_SOCIAL.handle}
              </a>
            </div>

            <Link
              href="/app"
              prefetch={false}
              onClick={() => setOpen(false)}
              className="btn btn-primary btn-lg group mt-4 w-full justify-center"
            >
              Launch ZeFi
              <ArrowRight className="h-4 w-4 transition-transform duration-500 ease-out-expo group-hover:translate-x-0.5" />
            </Link>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
