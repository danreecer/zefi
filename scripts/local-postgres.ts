/**
 * A real PostgreSQL server on localhost, with nothing to install globally.
 *
 * `embedded-postgres` downloads an official PostgreSQL binary for this platform
 * and runs it as a normal server — real connection pooling, real concurrency,
 * unlike a WASM single-session build. Useful on a machine without Docker, and
 * used by the screenshot capture so the product can be photographed with real
 * data in it.
 *
 *   pnpm exec tsx scripts/local-postgres.ts
 *   DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5434/postgres"
 *
 * Cluster data lives in `.pgdata/` (gitignored). Delete it to start clean.
 */
import { existsSync, readdirSync, symlinkSync } from 'node:fs'
import { join } from 'node:path'

import EmbeddedPostgres from 'embedded-postgres'

/**
 * The published `@embedded-postgres/*` packages ship each bundled library under
 * its fully-versioned name (`libzstd.1.5.7.dylib`) but the binaries link against
 * the short soname (`libzstd.1.dylib`), and the symlinks between them are
 * missing. Without this the server dies at startup with a dyld error. Creating
 * the aliases is safe and idempotent.
 */
function repairLibrarySymlinks(): void {
  // `require.resolve` on the package's package.json fails when it is not listed
  // in the exports map, so walk node_modules for the native lib directory.
  const roots = [
    join(process.cwd(), 'node_modules', '@embedded-postgres'),
    join(process.cwd(), 'node_modules', '.pnpm'),
  ]

  const libDirs: string[] = []
  const visit = (dir: string, depth: number) => {
    if (depth > 4 || !existsSync(dir)) return
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue
      const child = join(dir, entry.name)
      if (entry.name === 'lib' && child.includes('native')) {
        libDirs.push(child)
        continue
      }
      visit(child, depth + 1)
    }
  }
  for (const root of roots) {
    if (!existsSync(root)) continue
    for (const entry of readdirSync(root)) {
      if (root.endsWith('.pnpm') && !entry.startsWith('@embedded-postgres+')) continue
      visit(join(root, entry), 0)
    }
  }

  for (const libDir of libDirs) {
    for (const file of readdirSync(libDir)) {
      const match = /^(lib.+?)\.((?:\d+\.)*\d+)\.dylib$/.exec(file)
      if (!match) continue
      const base = match[1] as string
      const parts = (match[2] as string).split('.')
      // libzstd.1.5.7.dylib → libzstd.1.dylib, libzstd.1.5.dylib, libzstd.dylib
      const aliases = new Set([
        ...parts.map((_, i) => `${base}.${parts.slice(0, i + 1).join('.')}.dylib`),
        `${base}.dylib`,
      ])
      for (const alias of aliases) {
        if (alias === file) continue
        const target = join(libDir, alias)
        if (existsSync(target)) continue
        try {
          symlinkSync(file, target)
        } catch {
          // Raced with another run, or not permitted. Neither is fatal.
        }
      }
    }
  }
}

const PORT = Number(process.env.PGLITE_PORT ?? process.env.PGPORT ?? 5434)

async function main() {
  repairLibrarySymlinks()

  const pg = new EmbeddedPostgres({
    databaseDir: './.pgdata',
    user: 'postgres',
    password: 'postgres',
    port: PORT,
    persistent: true,
  })

  // `initialise` is a no-op once the cluster exists.
  await pg.initialise().catch(() => undefined)
  await pg.start()

  console.log(`postgres ready on 127.0.0.1:${PORT}`)
  console.log(`DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:${PORT}/postgres"`)

  const shutdown = async () => {
    await pg.stop().catch(() => undefined)
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  // Hold the process open.
  await new Promise(() => {})
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
