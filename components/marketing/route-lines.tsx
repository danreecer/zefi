'use client'

import { motion, useReducedMotion } from 'framer-motion'

/**
 * Intent-route curves.
 *
 * Thin technical lines that trace the shape of the product's central idea: many
 * possible routes leaving one prompt, resolving on one node. Used as quiet
 * background structure in the hero — restrained line work rather than decoration.
 */
export function RouteLines({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion()

  const paths = [
    { d: 'M-40 262C160 262 250 168 452 168C654 168 742 262 944 262', delay: 0, opacity: 0.5 },
    { d: 'M-40 262C170 262 244 96 452 96C660 96 748 190 944 190', delay: 0.18, opacity: 0.32 },
    { d: 'M-40 262C150 262 256 336 452 336C648 336 736 288 944 288', delay: 0.36, opacity: 0.22 },
  ]

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 904 420"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      fill="none"
    >
      <defs>
        <linearGradient id="route-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#C23C06" stopOpacity="0" />
          <stop offset="22%" stopColor="#C23C06" stopOpacity="0.55" />
          <stop offset="78%" stopColor="#94300A" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#94300A" stopOpacity="0" />
        </linearGradient>
      </defs>

      {paths.map((path) => (
        <motion.path
          key={path.d}
          d={path.d}
          stroke="url(#route-fade)"
          strokeWidth={1}
          strokeLinecap="round"
          initial={reduceMotion ? { pathLength: 1, opacity: path.opacity } : { pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: path.opacity }}
          transition={{ duration: 2.1, delay: 0.4 + path.delay, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}

      <motion.circle
        cx={452}
        cy={262}
        r={3}
        fill="#C23C06"
        initial={reduceMotion ? { scale: 1, opacity: 0.7 } : { scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.7 }}
        transition={{ duration: 0.6, delay: 1.5, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  )
}
