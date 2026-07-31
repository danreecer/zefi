import { KeyRound, ScanSearch, ShieldCheck, SquarePen } from 'lucide-react'
import Link from 'next/link'

import { SectionHeader } from '@/components/marketing/section-header'

export const SAFETY_PILLARS = [
  {
    icon: KeyRound,
    title: 'ZeFi never holds keys',
    body: 'There is no wallet client with a private key anywhere in the codebase and no path that transmits key material to a server. Your wallet signs; ZeFi supplies what is to be signed and the reasoning behind it.',
    line: 'ZeFi never requests or stores seed phrases or private keys.',
  },
  {
    icon: SquarePen,
    title: 'The model writes prose, not values',
    body: 'Addresses, amounts, decimals, chain ids and contract references come from a curated registry and from validated user input. A language model cannot introduce any of them into a transaction.',
    line: 'Model output and executable transaction data are structurally separate.',
  },
  {
    icon: ScanSearch,
    title: 'A check that did not run is not a check that passed',
    body: 'Local validation covers chain, asset, decimals, recipient, balance and approval scope. Where a reading is unavailable the check reports “skipped”, and where deep simulation is unconfigured ZeFi says so rather than implying coverage.',
    line: 'ZeFi never claims a transaction has been fully simulated.',
  },
  {
    icon: ShieldCheck,
    title: 'Approval is explicit, and specific',
    body: 'Every transaction requires a separate review screen and a confirm control naming the actual action. Approvals are planned exact-amount; ZeFi will not present an unlimited allowance for signature.',
    line: 'No plan reaches a wallet without a human reading it first.',
  },
] as const

export function SafetySection() {
  return (
    <section className="section" id="safety">
      <div className="shell">
        <SectionHeader
          eyebrow="Safety and control"
          title={
            <>
              Your wallet
              <br />
              remains in control
            </>
          }
          lede="An assistant that can move money is only as trustworthy as the boundary around it. ZeFi's boundary is architectural rather than aspirational — these are properties of how it is built, not promises about how it behaves."
          action={
            <Link href="/security" className="btn btn-ghost">
              Read the security model
            </Link>
          }
        />

        <ul className="mt-12 grid gap-4 md:grid-cols-2">
          {SAFETY_PILLARS.map((pillar) => (
            <li key={pillar.title} className="panel-solid flex flex-col p-6">
              <span className="grid h-9 w-9 place-items-center rounded-full border border-line bg-ember-50">
                <pillar.icon className="h-4 w-4 text-ember-700" aria-hidden="true" />
              </span>
              <h3 className="display-md mt-4 text-ink">{pillar.title}</h3>
              <p className="mt-3 flex-1 text-[0.9375rem] leading-relaxed text-ink-soft">{pillar.body}</p>
              <p className="num mt-5 border-t border-line pt-4 text-[0.6875rem] leading-relaxed text-ember-700">
                {pillar.line}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
