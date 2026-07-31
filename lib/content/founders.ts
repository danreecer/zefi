/**
 * Founders.
 *
 * The single source of truth for the founders section on `/` and `/about`.
 * Add an entry here and both surfaces pick it up; leave the array empty and the
 * section removes itself rather than rendering a placeholder.
 *
 * Nothing in this file is inferred. Names, roles, links and photos are supplied
 * by the company — ZeFi's own copy rules apply to real people first.
 */

export interface FounderLink {
  label: string
  href: string
  /** Shown as the visible text, e.g. an @handle. */
  display: string
}

export interface Founder {
  name: string
  role: string
  /** Path under /public. Square images render best. */
  photo: string
  /** Alt text describing the person, not the file. */
  photoAlt: string
  /** Short statement of position. Keep to the company's voice: no hype. */
  statement: string[]
  links: FounderLink[]
}

export const FOUNDERS: Founder[] = [
  {
    name: 'Dan Reecer',
    role: 'Founder',
    photo: '/founder.jpg',
    photoAlt: 'Dan Reecer, founder of ZeFi',
    statement: [
      'ZeFi exists because the gap between knowing what you want to do onchain and safely doing it is still filled by tribal knowledge — which chain, which contract, which approval, what it costs, what it risks.',
      'Language models close part of that gap and open a new one. They read intent well; they should never be the thing that decides an address is correct. ZeFi is built along that line: interpretation by a model, verification by deterministic code, and a plan a person reads before anything is signed.',
    ],
    links: [{ label: 'X', href: 'https://x.com/danreecer_', display: '@danreecer_' }],
  },
]

export const hasFounders = FOUNDERS.length > 0
