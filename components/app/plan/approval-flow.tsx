'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, PenLine, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useAccount, useChainId, useSendTransaction, useSwitchChain, useWriteContract } from 'wagmi'

import { ERC20_ABI, explorerTxUrl, findToken, getChain } from '@/lib/chains/registry'
import { publicConfig } from '@/lib/config/public'
import { resolveTransfer } from '@/lib/planner/calldata'
import { isSignable, type TransactionPlan } from '@/lib/planner/types'
import { createId, truncateAddress } from '@/lib/utils'

/**
 * The approval flow.
 *
 * Three deliberate properties:
 *
 *  1. The trigger names the real action. It is never "Execute instantly", and it
 *     is disabled outright when the plan is not signable.
 *  2. Confirmation is a separate screen restating recipient, asset, amount and
 *     network — the four things a person actually needs to re-read.
 *  3. Calldata is built here from the registry and the plan, not from anything a
 *     model produced. Submission happens in the user's wallet; ZeFi only records
 *     the resulting hash, with an idempotency key so a retry cannot duplicate it.
 */
export function ApprovalFlow({ plan, planRecordId }: { plan: TransactionPlan; planRecordId: string }) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChainAsync } = useSwitchChain()
  const { sendTransactionAsync } = useSendTransaction()
  const { writeContractAsync } = useWriteContract()

  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<'review' | 'signing' | 'submitted' | 'failed'>('review')
  const [hash, setHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [idempotencyKey] = useState(() => createId('idem'))

  const action = plan.actions.find((item) => item.executionMode === 'wallet_signature')
  const chain = getChain(action?.chainKey ?? plan.intent.sourceNetwork)
  const token = chain && action?.asset ? findToken(chain.key, action.asset) : null

  const executionEnabled = publicConfig.executionEnabled
  const signable = isSignable(plan) && Boolean(action) && Boolean(chain?.chainId)

  const blockedReason = !executionEnabled
    ? 'Execution is switched off on this deployment (TRANSACTION_EXECUTION_ENABLED is false).'
    : !isConnected
      ? 'Connect a wallet to sign this transaction.'
      : !signable
        ? 'This plan is not in a signable state.'
        : null

  async function submit() {
    if (!action || !chain?.chainId || !address) return

    setPhase('signing')
    setError(null)

    try {
      if (chainId !== chain.chainId) {
        await switchChainAsync({ chainId: chain.chainId })
      }

      // Resolved by the same function the simulator uses, so the transaction
      // that was checked is the transaction that gets signed.
      const resolved = resolveTransfer(plan)
      if (!resolved.ok) throw new Error(resolved.reason)
      const { transfer } = resolved

      let submittedHash: `0x${string}`

      if (transfer.kind === 'native_transfer') {
        submittedHash = await sendTransactionAsync({
          to: transfer.recipient,
          value: transfer.value,
        })
      } else {
        // writeContract rather than raw calldata: wallets show the decoded
        // transfer, and the ABI here is the same one that produced
        // `transfer.data`, so the bytes are identical either way.
        submittedHash = await writeContractAsync({
          address: transfer.token!.address,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [transfer.recipient, transfer.amount],
        })
      }

      setHash(submittedHash)
      setPhase('submitted')

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          planId: planRecordId,
          chainId: chain.chainId,
          transactionHash: submittedHash,
          idempotencyKey,
        }),
      })

      if (!response.ok) {
        // The transaction is already onchain; only ZeFi's record failed.
        toast.warning('Transaction submitted, but ZeFi could not record it. It is still onchain.')
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'The wallet rejected or failed the request.'
      setError(/user rejected|denied/i.test(message) ? 'You rejected the request in your wallet.' : message)
      setPhase('failed')
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[0.8125rem] leading-relaxed text-ink-soft">
        {blockedReason ??
          'ZeFi will hand this to your wallet. Nothing is submitted until you sign it there.'}
      </p>

      <Dialog.Root
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next && phase !== 'submitted') {
            setPhase('review')
            setError(null)
          }
        }}
      >
        <Dialog.Trigger asChild>
          <button
            type="button"
            className="btn btn-primary shrink-0"
            disabled={Boolean(blockedReason)}
            title={blockedReason ?? undefined}
          >
            <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
            {plan.confirmationLabel}
          </button>
        </Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/25 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
          <Dialog.Content className="panel-solid fixed top-1/2 left-1/2 z-50 max-h-[85dvh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto p-6 shadow-[var(--shadow-raised)] focus:outline-none">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="display-md text-ink">
                  {phase === 'submitted' ? 'Submitted' : phase === 'failed' ? 'Not submitted' : 'Confirm before signing'}
                </Dialog.Title>
                <Dialog.Description className="mt-1.5 text-[0.875rem] leading-relaxed text-ink-soft">
                  {phase === 'submitted'
                    ? 'Your wallet broadcast this transaction. ZeFi is tracking it.'
                    : phase === 'failed'
                      ? 'Nothing was submitted. You can close this and try again.'
                      : 'Read these four fields against a source you trust. Transfers do not reverse.'}
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close"
                  className="hairline grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white hover:bg-ember-50"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </Dialog.Close>
            </div>

            {phase === 'review' || phase === 'signing' ? (
              <>
                <dl className="mt-6 divide-y divide-line overflow-hidden rounded-xl border border-line">
                  <Row label="Network" value={chain?.name ?? '—'} />
                  <Row label="Asset" value={action?.asset ?? '—'} />
                  <Row label="Amount" value={action?.amount ?? '—'} emphasis />
                  <Row
                    label="Recipient"
                    value={action?.recipient ?? '—'}
                    mono
                    emphasis
                    wrap
                  />
                  {token?.address ? <Row label="Contract" value={token.address} mono wrap /> : null}
                  {action?.functionSignature ? (
                    <Row label="Function" value={action.functionSignature} mono />
                  ) : null}
                </dl>

                {plan.risks.some((risk) => risk.severity !== 'info') ? (
                  <ul className="mt-4 space-y-2">
                    {plan.risks
                      .filter((risk) => risk.severity !== 'info')
                      .map((risk) => (
                        <li
                          key={risk.code}
                          className="flex gap-2.5 rounded-xl border border-caution/20 bg-caution-soft/60 p-3"
                        >
                          <AlertTriangle
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-caution"
                            aria-hidden="true"
                          />
                          <span className="text-[0.8125rem] leading-relaxed text-ink-soft">
                            <span className="font-medium text-ink">{risk.title}.</span> {risk.detail}
                          </span>
                        </li>
                      ))}
                  </ul>
                ) : null}

                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={phase === 'signing'}
                  className="btn btn-primary mt-6 w-full"
                >
                  {phase === 'signing' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Waiting for your wallet…
                    </>
                  ) : (
                    'Request wallet signature'
                  )}
                </button>

                <p className="mt-3 text-center text-[0.6875rem] leading-relaxed text-ink-muted">
                  ZeFi builds this transaction from its own registry. It holds no keys and cannot sign.
                </p>
              </>
            ) : null}

            {phase === 'submitted' && hash ? (
              <div className="mt-6">
                <div className="flex items-center gap-2.5 rounded-xl border border-positive/20 bg-positive-soft/70 p-4">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-positive" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-[0.875rem] font-medium text-ink">Broadcast by your wallet</p>
                    <p className="num mt-0.5 text-[0.75rem] break-all text-ink-soft">
                      {truncateAddress(hash, 12, 10)}
                    </p>
                  </div>
                </div>

                {chain ? (
                  <a
                    href={explorerTxUrl(chain.key, hash) ?? '#'}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="btn btn-ghost mt-4 w-full"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    View on {chain.shortName} explorer
                  </a>
                ) : null}

                <p className="mt-3 text-center text-[0.6875rem] leading-relaxed text-ink-muted">
                  Confirmation is decided by the network, not by ZeFi. The status updates as the chain
                  reports it.
                </p>
              </div>
            ) : null}

            {phase === 'failed' ? (
              <div className="mt-6">
                <div className="flex gap-2.5 rounded-xl border border-critical/20 bg-critical-soft/70 p-4">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-critical" aria-hidden="true" />
                  <p className="text-[0.875rem] leading-relaxed text-ink-soft">{error}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPhase('review')}
                  className="btn btn-ghost mt-4 w-full"
                >
                  Back to review
                </button>
              </div>
            ) : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}

function Row({
  label,
  value,
  mono = false,
  emphasis = false,
  wrap = false,
}: {
  label: string
  value: string
  mono?: boolean
  emphasis?: boolean
  wrap?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 bg-white px-4 py-3">
      <dt className="data-key shrink-0">{label}</dt>
      <dd
        className={[
          'text-right text-[0.875rem]',
          mono ? 'num' : '',
          emphasis ? 'font-medium text-ink' : 'text-ink-soft',
          wrap ? 'break-all' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {value}
      </dd>
    </div>
  )
}
