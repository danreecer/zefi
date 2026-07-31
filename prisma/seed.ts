/**
 * Seed script.
 *
 *   pnpm db:seed
 *
 * Creates one demo user with clearly-labelled example data. Every seeded
 * conversation, plan and transaction carries an explicit marker so nobody can
 * mistake seed data for their own history:
 *
 *   • the profile's clerkUserId is prefixed `seed_`
 *   • plan objects carry `illustrative: true`
 *   • an ActivityEvent records that the row set was seeded
 *
 * The script is idempotent — running it twice does not create a second user.
 */
import { PrismaClient } from '@prisma/client'

import { DEMO_CONVERSATIONS, HERO_PLAN, TRANSFER_PLAN } from '../lib/demo/fixtures'

const prisma = new PrismaClient()

const SEED_CLERK_ID = 'seed_demo_user'

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Nothing to seed.')
    process.exit(1)
  }

  console.log('Seeding ZeFi demo data…')

  const user = await prisma.userProfile.upsert({
    where: { clerkUserId: SEED_CLERK_ID },
    create: {
      clerkUserId: SEED_CLERK_ID,
      displayName: 'Demo',
      email: 'demo@zefi.ae',
    },
    update: {},
  })
  console.log(`  · user ${user.id}`)

  // Start from a clean slate for this one user so re-runs stay idempotent.
  await prisma.conversation.deleteMany({ where: { userId: user.id } })
  await prisma.transactionIntent.deleteMany({ where: { userId: user.id } })
  await prisma.walletConnection.deleteMany({ where: { userId: user.id } })

  const plans = { [HERO_PLAN.id]: HERO_PLAN, [TRANSFER_PLAN.id]: TRANSFER_PLAN }

  for (const fixture of DEMO_CONVERSATIONS) {
    const conversation = await prisma.conversation.create({
      data: {
        userId: user.id,
        title: fixture.title,
        createdAt: new Date(fixture.updatedAt),
        updatedAt: new Date(fixture.updatedAt),
      },
    })

    for (const message of fixture.messages) {
      const plan = message.planId ? plans[message.planId] : null

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: message.role,
          content: message.content,
          structuredContent: plan
            ? // Cast through JSON so the stored shape is exactly what the app reads back.
              (JSON.parse(JSON.stringify({ plan, intent: plan.intent, seeded: true })) as object)
            : { seeded: true },
        },
      })
    }

    // Persist the plan behind an intent, so /app/plans has real rows to show.
    const withPlan = fixture.messages.find((message) => message.planId)
    if (withPlan?.planId) {
      const plan = plans[withPlan.planId]
      if (plan) {
        const intent = await prisma.transactionIntent.create({
          data: {
            userId: user.id,
            conversationId: conversation.id,
            intentType: plan.intentType,
            structuredIntent: JSON.parse(JSON.stringify(plan.intent)) as object,
            confidence: plan.intent.confidence,
            status: plan.missingInformation.length > 0 ? 'needs_information' : 'planned',
          },
        })

        await prisma.transactionPlan.create({
          data: {
            intentId: intent.id,
            planData: JSON.parse(JSON.stringify(plan)) as object,
            validationData: JSON.parse(
              JSON.stringify({
                missingInformation: plan.missingInformation,
                blockers: plan.blockers,
                dataSources: plan.dataSources,
                seeded: true,
              }),
            ) as object,
            simulationData: JSON.parse(JSON.stringify(plan.simulation)) as object,
            riskData: JSON.parse(JSON.stringify(plan.risks)) as object,
            status: plan.status,
          },
        })
      }
    }

    console.log(`  · conversation “${fixture.title}”`)
  }

  await prisma.walletConnection.create({
    data: {
      userId: user.id,
      address: '0x7a3F2C8E5d1B4A6f9e0C3b7d2F5a8c1E4d6b9a0C',
      chainId: 8453,
      label: 'Seeded example',
    },
  })

  await prisma.usageRecord.createMany({
    data: [
      { userId: user.id, actionType: 'assistant_turn', units: 3 },
      { userId: user.id, actionType: 'plan_generation', units: 2 },
      { userId: user.id, actionType: 'wallet_read', units: 5 },
    ],
  })

  await prisma.activityEvent.create({
    data: {
      userId: user.id,
      action: 'seed.completed',
      metadata: {
        note: 'All rows for this user are illustrative fixtures created by prisma/seed.ts.',
        conversations: DEMO_CONVERSATIONS.length,
      },
    },
  })

  console.log('Done. All seeded rows are labelled illustrative.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => {
    void prisma.$disconnect()
  })
