import 'server-only'

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

import { AiUnavailableError } from '@/lib/ai/client'
import { AuthNotConfiguredError, UnauthenticatedError } from '@/lib/auth/session'
import { PersistenceUnavailableError } from '@/lib/db/client'
import { NotFoundOrForbiddenError } from '@/lib/db/repositories'

/**
 * A single response envelope for every API route, so clients never have to
 * guess at the shape, and so an error is always a structured object rather than
 * an HTML error page or a bare string.
 */

export type ApiSuccess<T> = { ok: true; data: T }
export type ApiFailure = { ok: false; error: { code: string; message: string; detail?: unknown } }

export function ok<T>(data: T, init?: ResponseInit): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ ok: true, data }, init)
}

export function fail(
  code: string,
  message: string,
  status: number,
  detail?: unknown,
): NextResponse<ApiFailure> {
  return NextResponse.json({ ok: false, error: { code, message, ...(detail ? { detail } : {}) } }, { status })
}

/**
 * Maps a thrown error onto a response.
 *
 * Every branch is deliberate: a failed AI provider is a 5xx that says the
 * provider failed, not a 200 with fabricated content. An ownership failure is a
 * 404 that does not distinguish "missing" from "someone else's".
 */
export function handleRouteError(error: unknown): NextResponse<ApiFailure> {
  if (error instanceof UnauthenticatedError) {
    return fail('unauthenticated', 'Sign in to continue.', 401)
  }
  if (error instanceof AuthNotConfiguredError) {
    return fail('auth_not_configured', error.message, 503)
  }
  if (error instanceof NotFoundOrForbiddenError) {
    return fail('not_found', error.message, 404)
  }
  if (error instanceof PersistenceUnavailableError) {
    return fail('persistence_unavailable', error.message, 503)
  }
  if (error instanceof ZodError) {
    return fail('invalid_request', 'The request did not match the expected shape.', 400, {
      issues: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    })
  }
  if (error instanceof AiUnavailableError) {
    const status = error.reason === 'rate-limited' ? 429 : error.reason === 'not-configured' ? 503 : 502
    return fail(`ai_${error.reason.replace(/-/g, '_')}`, error.message, status)
  }

  // Anything unrecognised is logged server-side and reported generically.
  console.error('[zefi] unhandled route error', error)
  return fail(
    'internal_error',
    'Something failed on ZeFi’s side. The error has been logged; nothing was submitted onchain.',
    500,
  )
}
