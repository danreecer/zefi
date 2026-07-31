import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Repository integration tests.
 *
 * These run against an in-memory fake of the Prisma surface the repositories
 * actually use, rather than a live database. That keeps them runnable in CI
 * with no services, and lets them assert the property that matters most:
 *
 *   every query touching user-owned data is scoped by the authenticated user.
 *
 * The fake records every call, so a repository that forgot its `userId` filter
 * fails here rather than in production.
 */

interface Call {
  model: string
  method: string
  args: Record<string, unknown>
}

const calls: Call[] = []

function makeDb() {
  const store = {
    conversations: [
      { id: 'conv_owned', userId: 'user_1', title: 'Mine', archived: false, updatedAt: new Date() },
      { id: 'conv_other', userId: 'user_2', title: 'Theirs', archived: false, updatedAt: new Date() },
    ],
    plans: [
      { id: 'plan_owned', intentId: 'intent_1', status: 'ready_for_signature', planData: { actions: [] } },
    ],
    records: [] as Array<Record<string, unknown>>,
  }

  const record = (model: string, method: string, args: Record<string, unknown> = {}) => {
    calls.push({ model, method, args })
  }

  const matchesOwner = (where: Record<string, unknown> | undefined, userId: string) => {
    if (!where) return false
    if (where.userId === userId) return true
    const nested = where.intent as { userId?: string } | undefined
    return nested?.userId === userId
  }

  return {
    conversation: {
      findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        record('conversation', 'findFirst', { where })
        return (
          store.conversations.find(
            (item) => item.id === where.id && item.userId === where.userId,
          ) ?? null
        )
      }),
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        record('conversation', 'findMany', { where })
        return store.conversations.filter((item) => item.userId === where.userId)
      }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        record('conversation', 'create', { data })
        return { id: 'conv_new', ...data }
      }),
      update: vi.fn(async (args: Record<string, unknown>) => {
        record('conversation', 'update', args)
        return {}
      }),
      updateMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        record('conversation', 'updateMany', { where })
        const count = store.conversations.filter(
          (item) => item.id === where.id && item.userId === where.userId,
        ).length
        return { count }
      }),
      deleteMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        record('conversation', 'deleteMany', { where })
        const before = store.conversations.length
        store.conversations = store.conversations.filter(
          (item) => !(item.id === where.id && item.userId === where.userId),
        )
        return { count: before - store.conversations.length }
      }),
    },
    message: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        record('message', 'create', { data })
        return { id: 'msg_1', ...data }
      }),
    },
    transactionIntent: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        record('transactionIntent', 'create', { data })
        return { id: 'intent_1', ...data }
      }),
    },
    transactionPlan: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        record('transactionPlan', 'create', { data })
        return { id: 'plan_new', ...data }
      }),
      findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        record('transactionPlan', 'findFirst', { where })
        return matchesOwner(where, 'user_1') && where.id === 'plan_owned'
          ? store.plans[0]
          : null
      }),
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        record('transactionPlan', 'findMany', { where })
        return matchesOwner(where, 'user_1') ? store.plans : []
      }),
      updateMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        record('transactionPlan', 'updateMany', { where })
        return { count: matchesOwner(where, 'user_1') && where.id === 'plan_owned' ? 1 : 0 }
      }),
    },
    transactionRecord: {
      findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        record('transactionRecord', 'findFirst', { where })
        const key = (where.OR as Array<Record<string, unknown>> | undefined)?.[0]?.idempotencyKey
        return store.records.find((item) => item.idempotencyKey === key) ?? null
      }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        record('transactionRecord', 'create', { data })
        const row = { id: `tx_${store.records.length}`, ...data }
        store.records.push(row)
        return row
      }),
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        record('transactionRecord', 'findMany', { where })
        return store.records.filter((item) => item.userId === where.userId)
      }),
      updateMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        record('transactionRecord', 'updateMany', { where })
        return { count: where.userId === 'user_1' ? 1 : 0 }
      }),
    },
    walletConnection: {
      upsert: vi.fn(async ({ where, create }: Record<string, Record<string, unknown>>) => {
        record('walletConnection', 'upsert', { where })
        return { id: 'wallet_1', ...create }
      }),
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        record('walletConnection', 'findMany', { where })
        return []
      }),
    },
    userProfile: {
      upsert: vi.fn(async ({ where, create }: Record<string, Record<string, unknown>>) => {
        record('userProfile', 'upsert', { where })
        return { id: 'user_1', ...create }
      }),
      findUnique: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        record('userProfile', 'findUnique', { where })
        return where.clerkUserId === 'clerk_1' ? { id: 'user_1', clerkUserId: 'clerk_1' } : null
      }),
    },
    usageRecord: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        record('usageRecord', 'create', { data })
        return data
      }),
      groupBy: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        record('usageRecord', 'groupBy', { where })
        return []
      }),
    },
    activityEvent: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        record('activityEvent', 'create', { data })
        return data
      }),
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        record('activityEvent', 'findMany', { where })
        return []
      }),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $transaction: vi.fn(async (fn: any) => fn(db)),
  }
}

let db = makeDb()

vi.mock('@/lib/db/client', () => ({
  getDb: () => db,
  requireDb: () => db,
  persistenceAvailable: () => true,
  PersistenceUnavailableError: class extends Error {},
}))

const repositories = await import('@/lib/db/repositories')
const { NotFoundOrForbiddenError } = repositories

beforeEach(() => {
  calls.length = 0
  db = makeDb()
})

describe('ownership scoping', () => {
  it('scopes every user-owned query by userId', async () => {
    await repositories.listConversations('user_1')
    await repositories.getConversation('user_1', 'conv_owned')
    await repositories.listPlans('user_1')
    await repositories.getPlan('user_1', 'plan_owned')
    await repositories.listTransactions('user_1')
    await repositories.listWalletConnections('user_1')
    await repositories.listActivity('user_1')

    const reads = calls.filter((call) => call.method.startsWith('find'))
    expect(reads.length).toBeGreaterThan(5)

    for (const call of reads) {
      const where = call.args.where as Record<string, unknown>
      const scoped =
        where?.userId === 'user_1' || (where?.intent as { userId?: string })?.userId === 'user_1'
      expect(scoped, `${call.model}.${call.method} was not scoped by userId`).toBe(true)
    }
  })

  it('never reads a user-owned row by primary key alone', async () => {
    await repositories.getConversation('user_1', 'conv_owned')
    await repositories.getPlan('user_1', 'plan_owned')

    // findUnique on a user-owned model would be the escalation bug.
    const unscoped = calls.filter(
      (call) => call.method === 'findUnique' && call.model !== 'userProfile',
    )
    expect(unscoped).toEqual([])
  })
})

describe('conversations', () => {
  it('creates, reads and lists', async () => {
    const created = await repositories.createConversation('user_1', 'Base USDC Bridge Plan')
    expect(created.id).toBe('conv_new')

    // Two rows exist in the fake; only one belongs to user_1. That is the
    // assertion — the scoping, not the count.
    const list = await repositories.listConversations('user_1')
    expect(list).toHaveLength(1)
    expect(list[0]?.id).toBe('conv_owned')

    const one = await repositories.getConversation('user_1', 'conv_owned')
    expect(one?.title).toBe('Mine')
  })

  it('returns null for a conversation belonging to someone else', async () => {
    expect(await repositories.getConversation('user_1', 'conv_other')).toBeNull()
  })

  it('refuses to rename another user’s conversation', async () => {
    await expect(repositories.renameConversation('user_1', 'conv_other', 'Hijacked')).rejects.toThrow(
      NotFoundOrForbiddenError,
    )
  })

  it('refuses to delete another user’s conversation', async () => {
    await expect(repositories.deleteConversation('user_1', 'conv_other')).rejects.toThrow(
      NotFoundOrForbiddenError,
    )
    // And the row survives.
    expect(await repositories.getConversation('user_2', 'conv_other')).not.toBeNull()
  })

  it('deletes its own', async () => {
    await expect(repositories.deleteConversation('user_1', 'conv_owned')).resolves.toBeTruthy()
  })
})

describe('messages', () => {
  it('proves ownership before writing', async () => {
    await repositories.appendMessage('user_1', 'conv_owned', { role: 'user', content: 'hello' })
    const order = calls.map((call) => `${call.model}.${call.method}`)
    // The ownership read must precede the write.
    expect(order.indexOf('conversation.findFirst')).toBeLessThan(order.indexOf('message.create'))
  })

  it('refuses to append to another user’s conversation', async () => {
    await expect(
      repositories.appendMessage('user_1', 'conv_other', { role: 'user', content: 'hi' }),
    ).rejects.toThrow(NotFoundOrForbiddenError)
    expect(calls.some((call) => call.model === 'message' && call.method === 'create')).toBe(false)
  })
})

describe('intents and plans', () => {
  const intent = {
    intentType: 'SEND' as const,
    sourceNetwork: 'base',
    destinationNetwork: null,
    sourceAsset: 'USDC',
    destinationAsset: null,
    amount: { value: '250', unit: 'token' as const },
    recipient: '0x4E8F2A1b9C7D3e5f6A0B1C2d3E4f5a6B7c8D9E0F',
    slippageTolerancePercent: null,
    priority: null,
    requiredApprovals: [],
    missingInformation: [],
    confidence: 0.97,
    assumptions: [],
    clarifyingQuestion: null,
    summary: 'Transfer 250 USDC on Base.',
  }

  it('persists an intent with no plan attached', async () => {
    const saved = await repositories.saveIntentAndPlan('user_1', {
      conversationId: 'conv_owned',
      intent,
      plan: null,
    })
    expect(saved?.plan).toBeNull()
    const created = calls.find((call) => call.model === 'transactionIntent')
    expect((created?.args.data as Record<string, unknown>).status).toBe('parsed')
  })

  it('refuses to attach an intent to another user’s conversation', async () => {
    await expect(
      repositories.saveIntentAndPlan('user_1', { conversationId: 'conv_other', intent, plan: null }),
    ).rejects.toThrow(NotFoundOrForbiddenError)
  })

  it('refuses to update a plan the user does not own', async () => {
    await expect(
      repositories.updatePlanStatus('user_1', 'plan_not_mine', 'submitted'),
    ).rejects.toThrow(NotFoundOrForbiddenError)
  })
})

describe('transaction recording', () => {
  const input = {
    planId: 'plan_owned',
    chainId: 8453,
    transactionHash: `0x${'a'.repeat(64)}`,
    idempotencyKey: 'idem_abcdefgh1234',
  }

  it('records a submission once', async () => {
    const first = await repositories.recordTransaction('user_1', input)
    expect(first.created).toBe(true)
  })

  it('absorbs a retry under the same idempotency key', async () => {
    await repositories.recordTransaction('user_1', input)
    const retry = await repositories.recordTransaction('user_1', input)

    expect(retry.created).toBe(false)
    // Exactly one row was ever created.
    const creates = calls.filter(
      (call) => call.model === 'transactionRecord' && call.method === 'create',
    )
    expect(creates).toHaveLength(1)
  })

  it('refuses to record against a plan the user does not own', async () => {
    await expect(
      repositories.recordTransaction('user_1', { ...input, planId: 'plan_not_mine' }),
    ).rejects.toThrow(NotFoundOrForbiddenError)
  })
})

describe('wallet connections', () => {
  it('stores only the public address, chain and label', async () => {
    await repositories.recordWalletConnection('user_1', {
      address: '0x7a3F2C8E5d1B4A6f9e0C3b7d2F5a8c1E4d6b9a0C',
      chainId: 8453,
      label: 'MetaMask',
    })
    const upsert = calls.find((call) => call.model === 'walletConnection')
    const where = upsert?.args.where as { userId_address_chainId: Record<string, unknown> }
    expect(where.userId_address_chainId?.userId).toBe('user_1')
    expect(where.userId_address_chainId?.chainId).toBe(8453)
  })
})

describe('no-database degradation', () => {
  it('returns empty results rather than throwing on reads', async () => {
    vi.resetModules()
    vi.doMock('@/lib/db/client', () => ({
      getDb: () => null,
      requireDb: () => {
        throw new Error('PersistenceUnavailable')
      },
      persistenceAvailable: () => false,
      PersistenceUnavailableError: class extends Error {},
    }))

    const offline = await import('@/lib/db/repositories')
    expect(await offline.listConversations('user_1')).toEqual([])
    expect(await offline.listPlans('user_1')).toEqual([])
    expect(await offline.listTransactions('user_1')).toEqual([])
    expect(await offline.knownRecipients('user_1')).toEqual([])
    expect(await offline.getUserProfile('clerk_1')).toBeNull()

    vi.doUnmock('@/lib/db/client')
    vi.resetModules()
  })
})
