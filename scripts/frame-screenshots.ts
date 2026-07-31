/**
 * Turns raw captures into presentation assets.
 *
 * Produces two things from each screenshot:
 *   • `raw/`    the untouched capture at full resolution
 *   • `framed/` the same shot inset in a rounded window on a ZeFi-coloured
 *               ground, at 16:9 — the form that survives a slide deck
 *
 *   pnpm exec tsx scripts/frame-screenshots.ts
 */
import { copyFileSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import sharp from 'sharp'

const SRC = join(process.cwd(), '.shots')
const OUT = join(process.cwd(), 'launch-kit', 'screenshots')
const RAW = join(OUT, 'raw')
const FRAMED = join(OUT, 'framed')

/** Output canvas. 16:9 at 2x, so it lands crisp on a retina projector. */
const W = 2560
const H = 1440
const INSET = 96
const RADIUS = 18

/** Ordered, human-readable names. Anything not listed is skipped. */
const CATALOGUE: Array<{ file: string; name: string; caption: string }> = [
  { file: 'mkt-01-hero', name: '01-hero', caption: 'Ask crypto anything — plan it, verify it, execute' },
  { file: 'app-03-assistant-plan', name: '02-assistant-transaction-plan', caption: 'ZeFi Intelligence — natural language becomes a validated plan' },
  { file: 'app-04-assistant-risk', name: '03-risk-register', caption: 'Every plan carries a deterministic risk review' },
  { file: 'app-01-dashboard', name: '04-dashboard', caption: 'The application — conversations, plans, security state' },
  { file: 'app-11-plan-detail', name: '05-plan-detail', caption: 'A saved transaction plan and its approval flow' },
  { file: 'mkt-04-plan', name: '06-plan-interface', caption: 'Understand before you sign — the plan interface in full' },
  { file: 'mkt-05-wallet', name: '07-wallet-intelligence', caption: 'Wallet intelligence — your portfolio, in sentences' },
  { file: 'app-06-wallet', name: '08-wallet-non-custodial', caption: 'Read-only by construction — ZeFi never holds keys' },
  { file: 'mkt-06-routefold', name: '09-routefold', caption: 'Routefold — model the next chain before you move' },
  { file: 'mkt-10-routefold-page', name: '10-routefold-product', caption: 'Routefold — a ZeFi company' },
  { file: 'mkt-07-safety', name: '11-safety-and-control', caption: 'Your wallet remains in control' },
  { file: 'mkt-08-agentic', name: '12-agentic-roadmap', caption: 'Agentic finance, bounded by policy' },
  { file: 'mkt-02-intent', name: '13-intent-to-execution', caption: 'Six stages between a sentence and a signature' },
  { file: 'mkt-03-intelligence', name: '14-intelligence', caption: 'The assistant that knows what it cannot see' },
  { file: 'app-07-plans', name: '15-plans', caption: 'Every plan ZeFi has built, with the status it reached' },
  { file: 'app-09-routefold', name: '16-routefold-in-app', caption: 'Routefold, inside the product' },
  { file: 'app-10-settings', name: '17-settings-capabilities', caption: 'Settings — exactly what this deployment can do' },
  { file: 'mkt-09-founder', name: '18-founder', caption: 'Who is building ZeFi' },
]

/** Warm ground with an ember bloom — the brand's ambient field, flattened. */
function background(): Buffer {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="base" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#FBF3E7"/>
        <stop offset="55%" stop-color="#F6E7D4"/>
        <stop offset="100%" stop-color="#F1DCC4"/>
      </linearGradient>
      <radialGradient id="ember" cx="0.72" cy="0.12" r="0.75">
        <stop offset="0%" stop-color="#FF6F22" stop-opacity="0.30"/>
        <stop offset="100%" stop-color="#FF6F22" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="night" cx="0.03" cy="1.02" r="0.55">
        <stop offset="0%" stop-color="#0F172A" stop-opacity="0.16"/>
        <stop offset="100%" stop-color="#0F172A" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#base)"/>
    <rect width="${W}" height="${H}" fill="url(#ember)"/>
    <rect width="${W}" height="${H}" fill="url(#night)"/>
  </svg>`)
}

function roundedMask(w: number, h: number): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <rect width="${w}" height="${h}" rx="${RADIUS}" ry="${RADIUS}" fill="#fff"/>
    </svg>`,
  )
}

async function frame(source: string, destination: string): Promise<void> {
  const maxW = W - INSET * 2
  const maxH = H - INSET * 2

  // Long full-page captures are cropped to the top rather than shrunk to
  // illegibility — a 1:3 image scaled into 16:9 reads as nothing.
  const meta = await sharp(source).metadata()
  const ratio = (meta.height ?? 1) / (meta.width ?? 1)
  const prepared =
    ratio > 1.15
      ? sharp(source).extract({
          left: 0,
          top: 0,
          width: meta.width ?? 1,
          height: Math.round((meta.width ?? 1) * 1.05),
        })
      : sharp(source)

  const shot = await prepared
    .resize({ width: maxW, height: maxH, fit: 'inside', withoutEnlargement: false })
    .toBuffer()
  const { width = maxW, height = maxH } = await sharp(shot).metadata()

  const rounded = await sharp(shot)
    .composite([{ input: roundedMask(width, height), blend: 'dest-in' }])
    .png()
    .toBuffer()

  // A soft drop shadow, built by blurring the silhouette behind the shot.
  const shadow = await sharp({
    create: { width, height, channels: 4, background: { r: 84, g: 34, b: 8, alpha: 0.30 } },
  })
    .composite([{ input: roundedMask(width, height), blend: 'dest-in' }])
    .extend({ top: 60, bottom: 60, left: 60, right: 60, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .blur(34)
    .png()
    .toBuffer()

  const left = Math.round((W - width) / 2)
  const top = Math.round((H - height) / 2)

  await sharp(background())
    .composite([
      { input: shadow, left: left - 60, top: top - 44 },
      { input: rounded, left, top },
    ])
    .png({ compressionLevel: 9 })
    .toFile(destination)
}

async function main() {
  for (const dir of [OUT, RAW, FRAMED]) mkdirSync(dir, { recursive: true })

  const available = new Set(
    readdirSync(SRC)
      .filter((f) => f.endsWith('.png'))
      .map((f) => f.replace(/\.png$/, '')),
  )

  const manifest: Array<{ name: string; caption: string }> = []
  let framed = 0

  for (const entry of CATALOGUE) {
    if (!available.has(entry.file)) {
      console.log(`  – skipped ${entry.file} (not captured)`)
      continue
    }
    const source = join(SRC, `${entry.file}.png`)
    copyFileSync(source, join(RAW, `${entry.name}.png`))
    await frame(source, join(FRAMED, `${entry.name}.png`))
    manifest.push({ name: entry.name, caption: entry.caption })
    framed += 1
    console.log(`  ✓ ${entry.name}`)
  }

  writeFileSync(
    join(OUT, 'manifest.json'),
    `${JSON.stringify({ generated: 'pnpm exec tsx scripts/frame-screenshots.ts', shots: manifest }, null, 2)}\n`,
  )

  console.log(`\n${framed} shots → launch-kit/screenshots/{raw,framed}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
