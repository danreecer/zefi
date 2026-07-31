/**
 * Promotional content.
 *
 * One source for every promotional surface — the announcement bar, the sticky
 * dock, the social rail, the launch dialog and the feature ticker all read from
 * here, so changing a claim changes it everywhere.
 *
 * The copy rules that govern the rest of the site govern this file harder,
 * because promotional surfaces are exactly where products start overstating
 * themselves. Nothing here may assert a user count, a transaction volume, a
 * customer, a partnership or a funding event. `SOCIAL_PROOF` exists for real
 * numbers when there are real numbers; it renders nothing while empty, in the
 * same way the founders section removes itself rather than showing a
 * placeholder.
 *
 * Every entry in `FEATURE_NOTES` must be checkable against /api/health or the
 * product itself. If a capability is switched off in a deployment, the note is
 * filtered out at render rather than shown as aspiration.
 */

export const PRODUCT_HUNT = {
  post: 'https://www.producthunt.com/products/zefi-2?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-zefi-2',
  badge:
    'https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1211798&theme=light&t=1785521644237',
  label: 'ZeFi is live on Product Hunt',
} as const

export const FOUNDER_SOCIAL = {
  name: 'Dan Reecer',
  handle: '@danreecer_',
  href: 'https://x.com/danreecer_',
  photo: '/founder.jpg',
  blurb: 'Building ZeFi in the open. Follow along for what ships next.',
} as const

/** Which capability each note depends on, so an off feature is never promoted. */
export type CapabilityKey = 'ai' | 'persistence' | 'deepSimulation' | 'execution' | 'always'

export interface FeatureNote {
  id: string
  requires: CapabilityKey
  title: string
  detail: string
  href: string
}

export const FEATURE_NOTES: FeatureNote[] = [
  {
    id: 'plan',
    requires: 'always',
    title: 'Every plan is deterministic',
    detail: 'The model reads your intent. Code decides the address, the amount and the route.',
    href: '/how-it-works',
  },
  {
    id: 'simulate',
    requires: 'deepSimulation',
    title: 'Simulated before you sign',
    detail: 'The token contract runs against live chain state, so a revert surfaces first.',
    href: '/transaction-safety',
  },
  {
    id: 'custody',
    requires: 'always',
    title: 'Your keys never move',
    detail: 'ZeFi reads balances and builds calldata. Your wallet does the signing.',
    href: '/security',
  },
  {
    id: 'transfers',
    requires: 'execution',
    title: 'Transfers execute today',
    detail: 'Native and ERC-20 transfers, signed in your own wallet after you confirm.',
    href: '/how-it-works',
  },
  {
    id: 'history',
    requires: 'persistence',
    title: 'Plans are kept',
    detail: 'Conversations, plans and the status each one reached, saved to your account.',
    href: '/how-it-works',
  },
  {
    id: 'routefold',
    requires: 'always',
    title: 'Routefold models the next chain',
    detail: 'Rank where an asset actually fits before you move it.',
    href: '/products/routefold',
  },
]

/**
 * Real, verifiable social proof. Empty by design.
 *
 * Populate only with numbers the company can substantiate. An invented figure
 * here would undo the thing the rest of the product is built to demonstrate.
 */
export interface ProofPoint {
  value: string
  label: string
}

export const SOCIAL_PROOF: ProofPoint[] = []
