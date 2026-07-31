import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { AmbientField } from '@/components/marketing/ambient-field'
import { publicConfig } from '@/lib/config/public'

export function FinalCta() {
  return (
    <section className="relative px-3 pb-3 sm:px-5 sm:pb-5 lg:px-7 lg:pb-6" id="get-started">
      <div className="relative isolate overflow-hidden rounded-[28px]">
        <AmbientField variant="plate" className="-z-10" />

        <div className="zefi-frame relative flex flex-col items-center px-6 py-20 text-center sm:px-10 sm:py-24 lg:py-28">
          <span className="chip chip-ember">
            <span className="inline-block h-1.5 w-1.5 animate-pulse-soft rounded-full bg-ember-600" />
            Live · no waitlist
          </span>

          <h2 className="display-xl mt-6 max-w-4xl text-ink">
            Ask. Plan.
            <br />
            Execute onchain.
          </h2>

          <p className="lede mt-5 max-w-xl">
            ZeFi is open. No waitlist, no invite code. Start with a question about your wallet — it will
            show you its reasoning before it shows you a transaction.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
            <Link href="/app" prefetch={false} className="btn btn-primary btn-lg group">
              Launch ZeFi
              <ArrowRight className="h-4 w-4 transition-transform duration-500 ease-out-expo group-hover:translate-x-0.5" />
            </Link>
            <a
              href={publicConfig.routefoldUrl}
              {...(publicConfig.routefoldIsExternal
                ? { target: '_blank', rel: 'noreferrer noopener' }
                : {})}
              className="btn btn-paper btn-lg"
            >
              Explore Routefold
            </a>
          </div>

          <p className="mt-8 max-w-lg text-[0.75rem] leading-relaxed text-ink-muted">
            ZeFi never requests or stores seed phrases or private keys. Connected wallets retain custody
            and sign transactions directly.
          </p>
        </div>
      </div>
    </section>
  )
}
