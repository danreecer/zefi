/**
 * Pushes environment variables to the Vercel project.
 *
 *   VERCEL_TOKEN=... VERCEL_PROJECT_ID=... pnpm exec tsx scripts/push-vercel-env.ts
 *
 * Reads `.env.vercel.local`, skips anything blank or still holding a
 * placeholder, and upserts the rest. Values are never printed — only key names
 * and the outcome. Secrets are marked `encrypted`; `NEXT_PUBLIC_*` values are
 * `plain`, because they are inlined into the client bundle at build time and
 * encrypting them would be theatre.
 */
import { readFileSync } from 'node:fs'

const TOKEN = process.env.VERCEL_TOKEN
const PROJECT = process.env.VERCEL_PROJECT_ID
const TARGETS = ['production', 'preview', 'development']

if (!TOKEN || !PROJECT) {
  console.error('VERCEL_TOKEN and VERCEL_PROJECT_ID are required')
  process.exit(1)
}

/** Overrides applied on top of the file, for values that differ in production. */
const OVERRIDES: Record<string, string> = {
  // zefi.ae 308s to www, so the canonical must be the hostname that serves.
  NEXT_PUBLIC_APP_URL: 'https://www.zefi.ae',
}

const SKIP_IF_PLACEHOLDER = /<[A-Z_]+>|^$/

function parseEnvFile(path: string): Array<[string, string]> {
  const out: Array<[string, string]> = []
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const index = line.indexOf('=')
    const key = line.slice(0, index).trim()
    const value = line.slice(index + 1).trim()
    out.push([key, value])
  }
  return out
}

async function api(path: string, init?: RequestInit) {
  const response = await fetch(`https://api.vercel.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  return { status: response.status, body: await response.json().catch(() => ({})) }
}

async function main() {
  const entries = new Map(parseEnvFile('.env.vercel.local'))
  for (const [key, value] of Object.entries(OVERRIDES)) entries.set(key, value)

  // Read what is already there so this is an upsert, not a duplicate-fest.
  const existing = await api(`/v9/projects/${PROJECT}/env?decrypt=false`)
  const byKey = new Map<string, string>()
  for (const item of (existing.body as { envs?: Array<{ id: string; key: string }> }).envs ?? []) {
    byKey.set(item.key, item.id)
  }

  let created = 0
  let updated = 0
  let skipped = 0

  for (const [key, value] of entries) {
    if (SKIP_IF_PLACEHOLDER.test(value)) {
      console.log(`  – ${key} (empty or placeholder)`)
      skipped += 1
      continue
    }

    const type = key.startsWith('NEXT_PUBLIC_') ? 'plain' : 'encrypted'
    const id = byKey.get(key)

    const result = id
      ? await api(`/v10/projects/${PROJECT}/env/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ value, type, target: TARGETS }),
        })
      : await api(`/v10/projects/${PROJECT}/env`, {
          method: 'POST',
          body: JSON.stringify({ key, value, type, target: TARGETS }),
        })

    if (result.status >= 400) {
      const error = (result.body as { error?: { message?: string } }).error
      console.log(`  ✗ ${key} — ${result.status} ${error?.message ?? ''}`)
      continue
    }

    console.log(`  ${id ? '↻' : '+'} ${key} (${type})`)
    if (id) updated += 1
    else created += 1
  }

  console.log(`\n${created} created, ${updated} updated, ${skipped} skipped`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
