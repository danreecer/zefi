/**
 * Stub for the `server-only` package.
 *
 * The real module throws on import outside a React Server Component, which
 * would make every server module untestable. Aliasing it here lets the test
 * suite exercise `lib/ai`, `lib/db` and `lib/simulation` directly, while the
 * real guard still applies in the Next.js build.
 */
export {}
