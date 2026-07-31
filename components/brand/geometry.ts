/**
 * ZEFI BRAND GEOMETRY
 *
 * Every ZeFi and Routefold mark in the product and in `/launch-kit` is drawn
 * from the path data in this file, so the header logo and the exported SVGs are
 * the same artwork rather than two drifting copies.
 *
 * ── The ZeFi symbol ──────────────────────────────────────────────────────────
 * Three candidate routes leave a single prompt (the top rail), fan out, and
 * converge on one verification node. A single confident stroke exits that node
 * and lands on the execution rail (the bottom rail).
 *
 * The resulting silhouette — rail, diagonal, rail — is a Z, but the Z is a
 * consequence of the routing diagram rather than a letter with decoration
 * bolted on. At favicon sizes the alternate routes drop away and the mark
 * resolves cleanly to its structure.
 *
 * ── The Routefold symbol ─────────────────────────────────────────────────────
 * A single route folded back on itself: the same stroke weight, cap treatment
 * and terminal node as ZeFi, but a serpentine rather than a convergence — a
 * plan being folded into a sequence instead of many options resolving into one.
 */

/** Canonical symbol canvas. All symbol paths are authored at this size. */
export const SYMBOL_VIEWBOX = '0 0 48 48'

/** The prompt rail: where intent enters. */
export const ZEFI_RAIL_TOP = 'M9 11H39'

/** The execution rail: where the verified action lands. */
export const ZEFI_RAIL_BOTTOM = 'M9 37H39'

/**
 * The selected route. Held almost straight so the Z silhouette stays crisp —
 * the curve is just enough to read as flow rather than a drawn letter.
 */
export const ZEFI_ROUTE_MAIN = 'M39 11C34 14.5 29 19.5 24 24C19 28.5 14 33.5 9 37'

/**
 * Two considered-but-rejected routes. Drawn dotted rather than solid: the line
 * style itself carries the meaning — solid is the route ZeFi selected, dotted
 * is a route it evaluated and set aside. Both sit in the upper counter so the
 * three inbound paths read as one fan instead of a closed shape.
 */
export const ZEFI_ROUTE_ALT_A = 'M33 11C33 16.8 28.6 20.6 24 24'
export const ZEFI_ROUTE_ALT_B = 'M26 11C26 18.4 24.7 21.2 24 24'

/** Dot pattern for the alternates. Round caps turn zero-length dashes into dots. */
export const ZEFI_ALT_DASH = '0.01 2.9'

/** The verification node: the point at which possibilities resolve into one. */
export const ZEFI_NODE = { cx: 24, cy: 24, r: 2.7 } as const

/**
 * ── Routefold ────────────────────────────────────────────────────────────────
 * The deliberate inverse of the ZeFi symbol. Where ZeFi collapses many possible
 * routes into one verified action, Routefold takes one product and unfolds it
 * into ranked destinations. Same canvas, same stroke weight, same node
 * language — opposite direction of travel.
 */
/** The spine: the single product every candidate route departs from. */
export const ROUTEFOLD_SPINE = 'M11 14V34'
/** Three candidate destinations, their rail length encoding chain-fit rank. */
export const ROUTEFOLD_BRANCH_UP = 'M11 14H29'
export const ROUTEFOLD_BRANCH_MID = 'M11 24H35'
export const ROUTEFOLD_BRANCH_DOWN = 'M11 34H24'
/** The top-ranked destination carries the accent; the others are candidates. */
export const ROUTEFOLD_NODE = { cx: 35, cy: 24, r: 3 } as const
export const ROUTEFOLD_NODE_UP = { cx: 29, cy: 14, r: 2.2 } as const
export const ROUTEFOLD_NODE_DOWN = { cx: 24, cy: 34, r: 2.2 } as const

/**
 * ── The ZeFi wordmark ────────────────────────────────────────────────────────
 * Monolinear geometric letterforms drawn on a 72-unit cap height with an
 * 11-unit stem. The Z is the symbol's own geometry at text scale, which is what
 * ties the lockup together. Authored as strokes so weight stays perfectly even
 * and the mark never depends on a font being present.
 *
 * Canvas: 0 0 242 120 · cap top y=24 · baseline y=96 · x-height top y=44
 */
export const WORDMARK_VIEWBOX = '0 0 242 120'
export const WORDMARK_STROKE = 11

/** Z — the same rail/diagonal/rail structure as the symbol. */
export const WORDMARK_Z = 'M20 29.5H74L20 90.5H74'

/** e — a single stroke: terminal, bowl, crossbar. */
export const WORDMARK_E =
  'M130.75 80.25A20.5 20.5 0 0 1 92.5 70A20.5 20.5 0 0 1 133.5 70H92.5'

/** F — stem and two arms. */
export const WORDMARK_F = 'M197.5 29.5H157.5V96'
export const WORDMARK_F_ARM = 'M157.5 62.5H189.5'

/** i — stem; the tittle is drawn as a node, echoing the symbol. */
export const WORDMARK_I = 'M216 44V96'
export const WORDMARK_I_DOT = { cx: 216, cy: 31, r: 6 } as const

/** Routefold wordmark is set in the display face; see `RoutefoldLogo`. */
export const BRAND = {
  name: 'ZeFi',
  legalName: 'ZeFi',
  domain: 'zefi.ae',
  tagline: 'Ask. Plan. Execute onchain.',
  descriptor: 'The AI operating system for onchain finance.',
} as const
