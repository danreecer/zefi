import type { Metadata } from 'next'

import { AppPageHeader, AppSection } from '@/components/app/page-header'
import { WalletIntelligence } from '@/components/app/wallet/wallet-intelligence'
import { requireUser } from '@/lib/auth/session'
import { listWalletConnections } from '@/lib/db/repositories'

export const metadata: Metadata = { title: 'Wallet' }
export const dynamic = 'force-dynamic'

export default async function WalletPage() {
  const user = await requireUser()
  const connections = user.userId ? await listWalletConnections(user.userId) : []

  return (
    <AppSection>
      <AppPageHeader
        title="Wallet intelligence"
        description="Read-only. ZeFi reads balances over configured RPC endpoints and stamps every figure with the moment it was read. It holds no keys and can initiate nothing on its own."
      />

      <div className="mt-8">
        <WalletIntelligence
          knownConnections={connections.map((connection) => ({
            id: connection.id,
            address: connection.address,
            chainId: connection.chainId,
            label: connection.label,
            lastSeenAt: connection.lastSeenAt.toISOString(),
          }))}
        />
      </div>
    </AppSection>
  )
}
