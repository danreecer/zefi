'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * Dismissal state for promotional surfaces.
 *
 * Two properties this needs and a `useState` would not give:
 *
 *  1. A dismissal survives navigation and reload. Re-showing a banner someone
 *     has already closed is the single fastest way to make a site feel hostile.
 *  2. Every surface reads the same store, so the orchestrator can ask "is
 *     anything intrusive already open?" without prop-drilling.
 *
 * `useSyncExternalStore` rather than an effect: the server has no localStorage,
 * so the server snapshot is the unread default and the client swaps to the real
 * value on hydration without a state write during render.
 */

const KEY_PREFIX = 'zefi.promo.'

type Listener = () => void
const listeners = new Set<Listener>()

/** Mirrors localStorage so getSnapshot stays cheap and referentially stable. */
const cache = new Map<string, boolean>()

function read(key: string): boolean {
  if (cache.has(key)) return cache.get(key) ?? false
  let value = false
  try {
    value = window.localStorage.getItem(KEY_PREFIX + key) === '1'
  } catch {
    // Private browsing, or storage disabled. Treat as not dismissed.
    value = false
  }
  cache.set(key, value)
  return value
}

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function dismissPromo(key: string) {
  cache.set(key, true)
  try {
    window.localStorage.setItem(KEY_PREFIX + key, '1')
  } catch {
    // Nothing to do — the in-memory cache still suppresses it this session.
  }
  emit()
}

/** `[dismissed, dismiss]`. Server-renders as not dismissed. */
export function useDismissable(key: string): [boolean, () => void] {
  const dismissed = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => false,
  )
  const dismiss = useCallback(() => dismissPromo(key), [key])
  return [dismissed, dismiss]
}

/** True once the component is running in the browser. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
}
