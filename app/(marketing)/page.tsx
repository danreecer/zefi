import type { Metadata } from 'next'

import { Hero } from '@/components/marketing/hero'
import { AgenticSection } from '@/components/marketing/sections/agentic'
import { FinalCta } from '@/components/marketing/sections/final-cta'
import { FoundersSection } from '@/components/marketing/sections/founders'
import { IntelligenceSection } from '@/components/marketing/sections/intelligence'
import { IntentToExecution } from '@/components/marketing/sections/intent-to-execution'
import { MissionSection } from '@/components/marketing/sections/mission'
import { PlanDemoSection } from '@/components/marketing/sections/plan-demo'
import { RoutefoldSection } from '@/components/marketing/sections/routefold'
import { SafetySection } from '@/components/marketing/sections/safety'
import { WalletIntelligenceSection } from '@/components/marketing/sections/wallet-intelligence'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <IntentToExecution />
      <IntelligenceSection />
      <PlanDemoSection />
      <WalletIntelligenceSection />
      <RoutefoldSection />
      <SafetySection />
      <AgenticSection />
      <MissionSection />
      <FoundersSection variant="compact" className="pt-0" />
      <FinalCta />
    </>
  )
}
