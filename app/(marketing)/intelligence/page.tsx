import type { Metadata } from 'next'
import Link from 'next/link'

import { PageHero } from '@/components/marketing/page-hero'
import { SectionHeader } from '@/components/marketing/section-header'
import { IntelligenceSection } from '@/components/marketing/sections/intelligence'
import { QUICK_PROMPTS } from '@/lib/demo/fixtures'

export const metadata: Metadata = {
  title: 'ZeFi Intelligence',
  description:
    'The conversational crypto assistant and intent-processing interface behind ZeFi — wired to a chain registry, a wallet reader and a deterministic planner.',
  alternates: { canonical: '/intelligence' },
}

const PIPELINE = [
  ['01', 'Classify the request', 'A deterministic classifier runs first and gives the model a prior. It is also the complete classifier when no AI provider is configured.'],
  ['02', 'Extract structured intent', 'A forced tool call produces a typed object — the same contract on either provider. It is parsed with Zod; a schema mismatch gets one repair attempt, then becomes an error.'],
  ['03', 'Determine missing information', 'Chains and assets are resolved against the registry, addresses are checksummed, amounts are range-checked against real decimals.'],
  ['04', 'Retrieve permitted context', 'Only the wallet reads this intent actually needs, on the server, over configured RPC endpoints — each stamped with its read time.'],
  ['05', 'Construct a plan or an answer', 'Transactional intents go to the deterministic planner. Everything else is answered directly, with the wallet context attached.'],
  ['06', 'Deterministic validation', 'Local simulation checks chain, wallet, recipient, asset, amount, balance, approval scope and encodability.'],
  ['07', 'Generate the explanation', 'The model is given the finished plan and asked to explain it. It cannot change a value; it can only describe one.'],
  ['08', 'Present for review', 'The plan, its risks, its provenance and its confirm label are returned together. Nothing proceeds without a human.'],
] as const

const GUARANTEES = [
  {
    title: 'Numbers never originate in the model',
    body: 'Addresses, decimals, chain ids and contract references come from the registry. Amounts come from the user, validated as decimal strings and converted with BigInt — never through a float.',
  },
  {
    title: 'Untrusted text is framed as untrusted',
    body: 'User messages are sanitised of control characters and bidi overrides, then wrapped in delimiters the system prompt identifies as data. The real defence, though, is structural: model output has no path into transaction data.',
  },
  {
    title: 'Failure is reported, not papered over',
    body: 'A configured provider that fails produces an error. It never silently becomes a fixture, and demo mode never activates as a fallback.',
  },
  {
    title: 'Timeouts and retries are bounded',
    body: 'Requests carry an explicit timeout and at most two provider retries. Structured generation gets exactly one repair attempt before giving up honestly.',
  },
] as const

export default function IntelligencePage() {
  return (
    <>
      <PageHero
        eyebrow="ZeFi Intelligence"
        title={
          <>
            The intelligence
            <br />
            layer
          </>
        }
        lede="ZeFi Intelligence is the conversational surface and the intent-processing engine behind it. It answers questions about crypto, reads a connected wallet, and turns a sentence into a structured, validated transaction plan."
        aside={
          <div className="panel p-5">
            <p className="label-tech-sm text-ink-muted">Try asking</p>
            <ul className="mt-3 space-y-2">
              {QUICK_PROMPTS.slice(0, 4).map((prompt) => (
                <li key={prompt} className="text-[0.875rem] leading-snug text-ink-soft">
                  “{prompt}”
                </li>
              ))}
            </ul>
            <Link href="/app/chat" prefetch={false} className="btn btn-primary btn-sm mt-4 w-full">
              Open the assistant
            </Link>
          </div>
        }
      />

      <IntelligenceSection />

      <section className="section" id="pipeline">
        <div className="shell">
          <SectionHeader
            eyebrow="The pipeline"
            title="Eight stages, two of which touch a model"
            lede="Everything that could reach a transaction sits between stage two and stage seven — and none of it originates in a language model."
          />

          <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-2">
            {PIPELINE.map(([number, title, body]) => (
              <li key={number} className="bg-white p-6">
                <div className="flex items-baseline gap-3">
                  <span className="num text-[0.6875rem] text-ember-700">{number}</span>
                  <h3 className="text-[1.0625rem] font-medium text-ink">{title}</h3>
                </div>
                <p className="mt-2.5 text-[0.875rem] leading-relaxed text-ink-soft">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section pt-0">
        <div className="shell">
          <SectionHeader eyebrow="Guarantees" title="What holds regardless of what the model says" />
          <ul className="mt-10 grid gap-4 md:grid-cols-2">
            {GUARANTEES.map((guarantee) => (
              <li key={guarantee.title} className="panel-solid p-6">
                <h3 className="display-md text-ink">{guarantee.title}</h3>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">{guarantee.body}</p>
              </li>
            ))}
          </ul>

          <div className="panel-quiet mt-4 p-6">
            <p className="label-tech-sm text-ink-muted">Model configuration</p>
            <p className="mt-3 max-w-3xl text-[0.9375rem] leading-relaxed text-ink-soft">
              ZeFi does not hardcode a model identifier anywhere in its source, and it does not hardcode a
              vendor either. The provider sits behind an interface with two shipped implementations —
              OpenAI by default, Anthropic via <span className="num text-ink">AI_PROVIDER=anthropic</span>
              {' '}— and the model comes from <span className="num text-ink">OPENAI_MODEL</span> or{' '}
              <span className="num text-ink">ANTHROPIC_MODEL</span>. An operator picks what their key is
              entitled to use, and the deployment does not break when a model name is retired. If neither
              is configured, the AI layer reports itself unavailable rather than guessing.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
