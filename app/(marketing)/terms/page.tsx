import type { Metadata } from 'next'

import { LegalPage, type LegalSection } from '@/components/marketing/legal-page'

export const metadata: Metadata = {
  title: 'Terms',
  description: 'The terms on which ZeFi is provided, and the limits of what it claims to do.',
  alternates: { canonical: '/terms' },
}

const SECTIONS: readonly LegalSection[] = [
  {
    heading: 'What ZeFi is',
    body: [
      'ZeFi provides informational, technical, and transaction-planning tools. Outputs may contain incomplete assumptions and do not constitute financial, investment, legal, tax, compliance, or security-audit advice.',
      'ZeFi is software that helps you understand and construct onchain transactions. It is not a broker, an exchange, a custodian, an investment adviser, or a money transmitter, and it does not hold, control, or direct user funds.',
    ],
  },
  {
    heading: 'Non-custodial by construction',
    body: [
      'ZeFi never requests or stores seed phrases or private keys. Connected wallets retain custody and sign transactions directly. Every transaction originates from your wallet, under your signature, after your explicit approval.',
      'Because ZeFi holds no keys, it cannot reverse, cancel, recover, or refund a transaction once you have signed it. No party can.',
    ],
  },
  {
    heading: 'Accuracy and estimates',
    body: [
      'ZeFi is designed to leave a figure blank rather than fabricate one, and to report a check as skipped rather than as passed. Even so, estimates are estimates: network costs, execution times and route outcomes depend on conditions at the moment of submission, not at the moment of planning.',
      'Where a deep simulation provider is not configured, ZeFi performs local deterministic validation only. Local validation cannot prove a transaction will not revert, and ZeFi does not claim otherwise.',
    ],
  },
  {
    heading: 'AI-generated content',
    body: [
      'Explanations are produced by a language model. Model output is used for interpretation and explanation only; it is structurally prevented from supplying addresses, amounts, contract references, fees, or statuses. Even so, an explanation can be incomplete or mistaken, and you should read the plan itself rather than only the prose around it.',
    ],
  },
  {
    heading: 'Your responsibilities',
    body: [
      'You are responsible for verifying recipient addresses in full, for the consequences of any transaction you sign, for the security of your own wallet and devices, and for compliance with the laws that apply to you.',
      'You agree not to use ZeFi to conduct or facilitate unlawful activity, to attempt to circumvent its rate limits or authorisation checks, or to access another user’s data.',
    ],
  },
  {
    heading: 'Availability',
    body: [
      'ZeFi is live and open to the public. Features may still change, be withdrawn, or be unavailable. Third-party dependencies — authentication, model inference, RPC endpoints, routing providers — can fail independently of ZeFi, and some ZeFi capabilities are unavailable when they do.',
    ],
  },
  {
    heading: 'No warranty',
    body: [
      'ZeFi is provided “as is” and “as available”, without warranties of any kind, whether express or implied, including any implied warranty of merchantability, fitness for a particular purpose, or non-infringement.',
    ],
  },
  {
    heading: 'Limitation of liability',
    body: [
      'To the maximum extent permitted by law, ZeFi is not liable for any indirect, incidental, special, consequential or exemplary damages, or for any loss of funds, profits, data, or opportunity arising from your use of the service.',
      'Nothing in these terms excludes liability that cannot lawfully be excluded.',
    ],
  },
  {
    heading: 'Regulatory status',
    body: [
      'ZeFi operates at zefi.ae. A country-code domain is an address, not a licence. ZeFi holds no financial-services registration, authorisation, or supervised status in the United Arab Emirates or in any other jurisdiction, and nothing on this site should be read as implying one.',
    ],
  },
  {
    heading: 'Changes and contact',
    body: [
      'These terms may be updated. Material changes will be reflected in the last-updated date on this page.',
      'Questions: legal@zefi.ae.',
    ],
  },
]

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms"
      updated="18 March 2026"
      intro="The terms on which ZeFi is provided, and — more usefully — a plain account of what it does not claim to do."
      sections={SECTIONS}
    />
  )
}
