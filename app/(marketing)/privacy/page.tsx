import type { Metadata } from 'next'

import { LegalPage, type LegalSection } from '@/components/marketing/legal-page'

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'What ZeFi collects, what it never collects, and how long it keeps what it holds.',
  alternates: { canonical: '/privacy' },
}

const SECTIONS: readonly LegalSection[] = [
  {
    heading: 'What ZeFi never collects',
    body: [
      'ZeFi never requests, receives, transmits, or stores a private key, a seed phrase, a recovery phrase, or any other key material. There is no field for one, no API that accepts one, and no code path that would use one. If any interface ever asks you for a seed phrase while claiming to be ZeFi, it is not ZeFi.',
      'ZeFi does not take custody of funds. Connected wallets retain custody at all times and sign transactions directly.',
    ],
  },
  {
    heading: 'Account information',
    body: [
      'Authentication is handled by Clerk. ZeFi stores a profile row containing the identifier Clerk issues, an optional display name, and an optional email address. Credentials themselves are held by Clerk and never by ZeFi.',
      'If no database is configured for a deployment, no profile is stored at all and nothing persists between requests.',
    ],
  },
  {
    heading: 'Conversations and plans',
    body: [
      'When persistence is configured, ZeFi stores the messages you send, the replies it produces, the structured intents it extracts, and the transaction plans it builds. This is what makes conversation history and saved plans work.',
      'Message content is sent to the configured AI provider in order to generate a reply. In the default configuration that provider is Anthropic, and its own handling of that data is governed by its terms rather than by this policy.',
    ],
  },
  {
    heading: 'Wallet data',
    body: [
      'When you connect a wallet, ZeFi stores the public address, the chain id, and the time it was last seen. Public addresses are public information; nothing about storing one grants ZeFi any ability to move funds.',
      'Balance reads are performed server-side against the RPC endpoints configured for the deployment. Those endpoints will observe the addresses being queried. ZeFi does not sell, share, or broker this data.',
    ],
  },
  {
    heading: 'Transaction records',
    body: [
      'When you sign and submit a transaction through ZeFi, it records the plan it came from, the chain id, the transaction hash, and the resulting status. The transaction itself is already public on the chain; this record exists so the interface can show you your own history and explain what happened.',
    ],
  },
  {
    heading: 'Usage and activity',
    body: [
      'ZeFi records counts of actions taken — assistant turns, plans generated, simulations run — and an activity log of mutations, both scoped to your account. These support rate limiting, capacity planning, and the ability to answer the question “what happened to my account”.',
      'ZeFi does not use third-party advertising trackers, and the deployed Permissions-Policy disables interest-cohort tracking.',
    ],
  },
  {
    heading: 'Retention and deletion',
    body: [
      'Deleting a conversation removes its messages immediately; the deletion cascades at the database level rather than marking a flag. Deleting your account removes your profile and every row that hangs off it, including conversations, plans, wallet connections, transaction records, usage and activity.',
      'Onchain transactions cannot be deleted by anyone, including ZeFi. Removing ZeFi’s record of a transaction does not remove the transaction.',
    ],
  },
  {
    heading: 'Processors',
    body: [
      'A ZeFi deployment may use: Clerk for authentication, Anthropic for language model inference, a PostgreSQL host for storage, JSON-RPC providers for chain reads, and a hosting platform. Which of these are active depends on how the deployment is configured; a credential-free deployment contacts none of them.',
    ],
  },
  {
    heading: 'Contact',
    body: [
      'Privacy questions and data requests: privacy@zefi.ae. Security reports: security@zefi.ae.',
    ],
  },
]

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy"
      updated="18 March 2026"
      intro="ZeFi holds as little as it can and is specific about the rest. This page describes what a ZeFi deployment collects, why, and how long it keeps it."
      sections={SECTIONS}
    />
  )
}
