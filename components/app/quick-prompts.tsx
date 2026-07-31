'use client'

import { useRouter } from 'next/navigation'

import { QUICK_PROMPTS } from '@/lib/demo/fixtures'

/**
 * Quick prompts hand the text to the assistant route rather than sending it,
 * so the user still sees their own message in the composer before it goes.
 */
export function QuickPrompts() {
  const router = useRouter()

  return (
    <section className="panel-solid p-5">
      <h2 className="label-tech text-ink-soft">Start with</h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {QUICK_PROMPTS.map((prompt) => (
          <li key={prompt}>
            <button
              type="button"
              onClick={() => router.push(`/app/chat?prompt=${encodeURIComponent(prompt)}`)}
              className="hairline w-full rounded-xl bg-ivory/70 px-4 py-3 text-left text-[0.875rem] leading-snug text-ink-soft transition-colors hover:bg-white hover:text-ink"
            >
              {prompt}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
