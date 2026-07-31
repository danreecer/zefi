import 'server-only'

import { auth, currentUser } from '@clerk/nextjs/server'

import { serverEnv } from '@/lib/config/env'
import { ensureUserProfile, getUserProfile } from '@/lib/db/repositories'

/**
 * Authentication helpers.
 *
 * Two identities exist and must not be confused:
 *   • `clerkUserId` — the external identity from the auth provider
 *   • `userId`      — ZeFi's own UserProfile id, which every row hangs off
 *
 * Repositories only ever accept the second. `requireUser()` is the single place
 * that converts one into the other.
 */

export class UnauthenticatedError extends Error {
  constructor() {
    super('Authentication required.')
    this.name = 'UnauthenticatedError'
  }
}

export class AuthNotConfiguredError extends Error {
  constructor() {
    super('This deployment has no Clerk credentials configured, so the application area is unavailable.')
    this.name = 'AuthNotConfiguredError'
  }
}

export interface ZefiUser {
  /** ZeFi's internal profile id. Null when no database is configured. */
  userId: string | null
  clerkUserId: string
  displayName: string | null
  email: string | null
  /** True when there is no database, so nothing this user does will persist. */
  ephemeral: boolean
}

export function authConfigured(): boolean {
  return serverEnv.auth.configured
}

/** Returns the signed-in user, or null. Never throws for an anonymous visitor. */
export async function getCurrentUser(): Promise<ZefiUser | null> {
  if (!authConfigured()) return null

  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) return null

  const profile = await getUserProfile(clerkUserId)
  return {
    userId: profile?.id ?? null,
    clerkUserId,
    displayName: profile?.displayName ?? null,
    email: profile?.email ?? null,
    ephemeral: profile === null,
  }
}

/**
 * Returns the signed-in user, creating their profile row on first use.
 * Throws for anonymous callers — use this in every mutation path.
 */
export async function requireUser(): Promise<ZefiUser> {
  if (!authConfigured()) throw new AuthNotConfiguredError()

  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) throw new UnauthenticatedError()

  const clerk = await currentUser().catch(() => null)
  const displayName =
    clerk?.firstName ?? clerk?.username ?? clerk?.emailAddresses?.[0]?.emailAddress?.split('@')[0] ?? null
  const email = clerk?.emailAddresses?.[0]?.emailAddress ?? null

  const profile = await ensureUserProfile(clerkUserId, { displayName, email })

  return {
    userId: profile?.id ?? null,
    clerkUserId,
    displayName: profile?.displayName ?? displayName,
    email: profile?.email ?? email,
    ephemeral: profile === null,
  }
}

/**
 * The persisted profile id, or null when there is no database.
 * Callers branch on null rather than pretending persistence happened.
 */
export async function requirePersistedUserId(): Promise<string | null> {
  const user = await requireUser()
  return user.userId
}
