'use client'

import { useReducedMotion } from 'framer-motion'
import { useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'

/**
 * The ambient light field.
 *
 * Orange behaves like light in this system rather than paint: a warm mass right
 * of centre, cream falling off to the left, and midnight only at two opposing
 * corners for contrast. Three blurred blooms drift on long, offset cycles so the
 * field never repeats visibly, and the whole thing responds slightly to the
 * pointer — enough to feel alive, not enough to notice as an effect.
 *
 * Pointer tracking is written straight to CSS custom properties inside a
 * rAF-throttled listener, so it never re-renders React.
 */
export function AmbientField({
  variant = 'hero',
  className,
}: {
  variant?: 'hero' | 'soft' | 'app' | 'plate'
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (reduceMotion || variant !== 'hero') return
    const node = ref.current
    if (!node) return
    if (window.matchMedia('(pointer: coarse)').matches) return

    let frame = 0
    let targetX = 0
    let targetY = 0
    let currentX = 0
    let currentY = 0

    const onMove = (event: PointerEvent) => {
      targetX = (event.clientX / window.innerWidth - 0.5) * 2
      targetY = (event.clientY / window.innerHeight - 0.5) * 2
      if (!frame) frame = requestAnimationFrame(tick)
    }

    const tick = () => {
      // Critically damped follow, so the field lags the pointer like weight.
      currentX += (targetX - currentX) * 0.045
      currentY += (targetY - currentY) * 0.045
      node.style.setProperty('--px', currentX.toFixed(4))
      node.style.setProperty('--py', currentY.toFixed(4))

      if (Math.abs(targetX - currentX) > 0.001 || Math.abs(targetY - currentY) > 0.001) {
        frame = requestAnimationFrame(tick)
      } else {
        frame = 0
      }
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [reduceMotion, variant])

  const fieldClass =
    variant === 'hero'
      ? 'ambient-field'
      : variant === 'soft'
        ? 'ambient-field-soft'
        : variant === 'plate'
          ? 'ambient-field-plate'
          : 'ambient-field-app'

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      style={{ ['--px' as string]: 0, ['--py' as string]: 0 }}
    >
      <div className={cn('absolute inset-0', fieldClass)} />

      {variant === 'hero' ? (
        <>
          <div
            className="bloom animate-drift-a"
            style={{
              width: '52vw',
              height: '52vw',
              left: '34%',
              top: '10%',
              background:
                'radial-gradient(circle, rgba(255,111,34,0.62) 0%, rgba(255,154,61,0.28) 45%, rgba(255,154,61,0) 72%)',
              transform: 'translate3d(calc(var(--px) * 26px), calc(var(--py) * 20px), 0)',
            }}
          />
          <div
            className="bloom animate-drift-b"
            style={{
              width: '40vw',
              height: '40vw',
              left: '2%',
              top: '44%',
              background:
                'radial-gradient(circle, rgba(255,210,180,0.62) 0%, rgba(255,233,216,0) 70%)',
              transform: 'translate3d(calc(var(--px) * -18px), calc(var(--py) * -14px), 0)',
            }}
          />
          <div
            className="bloom animate-drift-c"
            style={{
              width: '34vw',
              height: '34vw',
              right: '-6%',
              top: '-10%',
              background: 'radial-gradient(circle, rgba(15,23,42,0.72) 0%, rgba(15,23,42,0) 68%)',
              transform: 'translate3d(calc(var(--px) * 14px), calc(var(--py) * 12px), 0)',
            }}
          />
          <div
            className="bloom animate-drift-b"
            style={{
              width: '30vw',
              height: '30vw',
              left: '-8%',
              bottom: '-12%',
              background: 'radial-gradient(circle, rgba(44,60,96,0.5) 0%, rgba(44,60,96,0) 68%)',
              transform: 'translate3d(calc(var(--px) * -10px), calc(var(--py) * 10px), 0)',
            }}
          />
        </>
      ) : null}

      <div className="grain-layer" />
    </div>
  )
}
