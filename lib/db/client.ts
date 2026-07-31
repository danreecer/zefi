import 'server-only'

import { PrismaClient } from '@prisma/client'

import { serverEnv } from '@/lib/config/env'

/**
 * Prisma client.
 *
 * ZeFi runs with or without a database. Without `DATABASE_URL` the product is
 * fully usable — the assistant answers, plans are built, wallets are read — but
 * nothing persists between requests, and every surface that would have shown
 * history says so explicitly rather than showing an empty list that implies
 * "you have no conversations".
 */

const globalForPrisma = globalThis as unknown as { zefiPrisma?: PrismaClient }

let instance: PrismaClient | null | undefined

export function getDb(): PrismaClient | null {
  if (instance !== undefined) return instance

  if (!serverEnv.database.configured) {
    instance = null
    return null
  }

  instance =
    globalForPrisma.zefiPrisma ??
    new PrismaClient({
      log: serverEnv.isProduction ? ['error'] : ['error', 'warn'],
    })

  if (!serverEnv.isProduction) globalForPrisma.zefiPrisma = instance
  return instance
}

export function persistenceAvailable(): boolean {
  return serverEnv.database.configured
}

export class PersistenceUnavailableError extends Error {
  constructor() {
    super(
      'This deployment has no DATABASE_URL configured, so conversations and plans are not saved between requests.',
    )
    this.name = 'PersistenceUnavailableError'
  }
}

/** Use where persistence is genuinely required (mutations that must durably land). */
export function requireDb(): PrismaClient {
  const db = getDb()
  if (!db) throw new PersistenceUnavailableError()
  return db
}
