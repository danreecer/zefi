/**
 * Renders the complete ZeFi brand asset set from the shared geometry in
 * `components/brand/geometry.ts`, so the marks in the product and the files in
 * `/launch-kit` can never drift apart.
 *
 *   pnpm brand:render
 *
 * Outputs SVG sources to `/launch-kit/svg` and rasterised PNGs to
 * `/launch-kit/png`, plus the runtime icons Next.js serves from `/app`.
 */
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  ROUTEFOLD_BRANCH_DOWN,
  ROUTEFOLD_BRANCH_MID,
  ROUTEFOLD_BRANCH_UP,
  ROUTEFOLD_NODE,
  ROUTEFOLD_NODE_DOWN,
  ROUTEFOLD_NODE_UP,
  ROUTEFOLD_SPINE,
  WORDMARK_E,
  WORDMARK_F,
  WORDMARK_F_ARM,
  WORDMARK_I,
  WORDMARK_I_DOT,
  WORDMARK_STROKE,
  WORDMARK_Z,
  ZEFI_ALT_DASH,
  ZEFI_NODE,
  ZEFI_RAIL_BOTTOM,
  ZEFI_RAIL_TOP,
  ZEFI_ROUTE_ALT_A,
  ZEFI_ROUTE_ALT_B,
  ZEFI_ROUTE_MAIN,
} from '../components/brand/geometry'

const require = createRequire(import.meta.url)
// sharp arrives transitively via Next.js; resolve it explicitly so this script
// keeps working regardless of hoisting layout.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sharp: any = require('sharp')

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SVG_DIR = join(ROOT, 'launch-kit', 'svg')
const PNG_DIR = join(ROOT, 'launch-kit', 'png')
const APP_DIR = join(ROOT, 'app')
const PUBLIC_DIR = join(ROOT, 'public', 'brand')

const INK = '#17130F'
const IVORY = '#FDFAF4'
const EMBER = '#ED4F08'
const AMBER = '#FF9A3D'
const BURNT = '#C23C06'

type Palette = { structure: string; node: string }
const LIGHT: Palette = { structure: INK, node: EMBER }
const DARK: Palette = { structure: IVORY, node: AMBER }
const MONO: Palette = { structure: INK, node: INK }

/* ── Fragments ─────────────────────────────────────────────────────────────── */

function symbolBody(p: Palette, withAlternates = true): string {
  return `${
    withAlternates
      ? `<g stroke="${p.structure}" stroke-width="1.7" stroke-linecap="round" stroke-dasharray="${ZEFI_ALT_DASH}" opacity="0.5"><path d="${ZEFI_ROUTE_ALT_A}"/><path d="${ZEFI_ROUTE_ALT_B}"/></g>`
      : ''
  }<g stroke="${p.structure}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="${ZEFI_RAIL_TOP}"/><path d="${ZEFI_ROUTE_MAIN}"/><path d="${ZEFI_RAIL_BOTTOM}"/></g><circle cx="${ZEFI_NODE.cx}" cy="${ZEFI_NODE.cy}" r="${ZEFI_NODE.r}" fill="${p.node}"/>`
}

function wordmarkBody(p: Palette): string {
  return `<g stroke="${p.structure}" stroke-width="${WORDMARK_STROKE}" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="6"><path d="${WORDMARK_Z}"/><path d="${WORDMARK_E}"/><path d="${WORDMARK_F}"/><path d="${WORDMARK_F_ARM}"/><path d="${WORDMARK_I}"/></g><circle cx="${WORDMARK_I_DOT.cx}" cy="${WORDMARK_I_DOT.cy}" r="${WORDMARK_I_DOT.r}" fill="${p.node}"/>`
}

function routefoldBody(p: Palette): string {
  return `<path d="${ROUTEFOLD_SPINE}" stroke="${p.structure}" stroke-width="1.6" stroke-linecap="round" opacity="0.38"/><g stroke="${p.structure}" stroke-width="2" stroke-linecap="round" opacity="0.5"><path d="${ROUTEFOLD_BRANCH_UP}"/><path d="${ROUTEFOLD_BRANCH_DOWN}"/></g><path d="${ROUTEFOLD_BRANCH_MID}" stroke="${p.structure}" stroke-width="3" stroke-linecap="round"/><g fill="${p.structure}" opacity="0.5"><circle cx="${ROUTEFOLD_NODE_UP.cx}" cy="${ROUTEFOLD_NODE_UP.cy}" r="${ROUTEFOLD_NODE_UP.r}"/><circle cx="${ROUTEFOLD_NODE_DOWN.cx}" cy="${ROUTEFOLD_NODE_DOWN.cy}" r="${ROUTEFOLD_NODE_DOWN.r}"/></g><circle cx="${ROUTEFOLD_NODE.cx}" cy="${ROUTEFOLD_NODE.cy}" r="${ROUTEFOLD_NODE.r}" fill="${p.node}"/>`
}

function svg(viewBox: string, body: string, extra = ''): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none"${extra}>\n  ${body}\n</svg>\n`
}

/* ── Lockups ───────────────────────────────────────────────────────────────── */

/**
 * Horizontal lockup. The wordmark is scaled to 0.25 so its 11-unit stem lands at
 * 2.75 against the symbol's 3 — close enough that the two read as one weight.
 */
function horizontalLockup(p: Palette): string {
  return svg(
    '0 0 112 48',
    `${symbolBody(p)}\n  <g transform="translate(48.6 9) scale(0.25)">${wordmarkBody(p)}</g>`,
  )
}

function stackedLockup(p: Palette): string {
  return svg(
    '0 0 140 104',
    `<g transform="translate(34 0) scale(1.5)">${symbolBody(p)}</g>\n  <g transform="translate(33.78 64.3) scale(0.3)">${wordmarkBody(p)}</g>`,
  )
}

function routefoldLockupSvg(p: Palette): string {
  // Routefold's wordmark stays typographic; the exported lockup uses the mark
  // plus a text element with an explicit fallback stack.
  return svg(
    '0 0 190 48',
    `${routefoldBody(p)}\n  <text x="54" y="31" font-family="Space Grotesk, Inter, Helvetica Neue, Arial, sans-serif" font-size="21" font-weight="500" letter-spacing="-0.4" fill="${p.structure}">Routefold</text>`,
  )
}

/** The ember plate used for app icons and the social avatar. */
function plateIcon(size: number, radiusRatio: number, glyphScale: number): string {
  const r = size * radiusRatio
  const g = 48 * glyphScale
  const offset = (size - g) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" fill="none">
  <defs>
    <linearGradient id="plate" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${AMBER}"/>
      <stop offset="52%" stop-color="${EMBER}"/>
      <stop offset="100%" stop-color="${BURNT}"/>
    </linearGradient>
    <radialGradient id="sheen" cx="0.24" cy="0.14" r="0.72">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.42"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#plate)"/>
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#sheen)"/>
  <g transform="translate(${offset} ${offset}) scale(${glyphScale})">${symbolBody({ structure: IVORY, node: '#FFFFFF' }, size >= 128)}</g>
</svg>
`
}

/** Cream avatar variant — used where a light mark reads better than a plate. */
function avatarCream(size: number): string {
  const glyphScale = size / 48 / 1.9
  const g = 48 * glyphScale
  const offset = (size - g) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" fill="none">
  <defs>
    <radialGradient id="warm" cx="0.62" cy="0.38" r="0.78">
      <stop offset="0%" stop-color="#FFE9D8"/>
      <stop offset="60%" stop-color="#FBF1E4"/>
      <stop offset="100%" stop-color="#F3E4D0"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#warm)"/>
  <g transform="translate(${offset} ${offset}) scale(${glyphScale})">${symbolBody(LIGHT)}</g>
</svg>
`
}

/* ── Write ─────────────────────────────────────────────────────────────────── */

const files: Array<[string, string]> = [
  // Symbols
  ['zefi-symbol.svg', svg('0 0 48 48', symbolBody(LIGHT))],
  ['zefi-symbol-dark-bg.svg', svg('0 0 48 48', symbolBody(DARK))],
  ['zefi-symbol-mono.svg', svg('0 0 48 48', symbolBody(MONO))],
  ['zefi-symbol-simple.svg', svg('0 0 48 48', symbolBody(LIGHT, false))],
  // Wordmark
  ['zefi-wordmark.svg', svg('0 0 242 120', wordmarkBody(LIGHT))],
  ['zefi-wordmark-dark-bg.svg', svg('0 0 242 120', wordmarkBody(DARK))],
  ['zefi-wordmark-mono.svg', svg('0 0 242 120', wordmarkBody(MONO))],
  // Lockups
  ['zefi-logo-horizontal-light.svg', horizontalLockup(LIGHT)],
  ['zefi-logo-horizontal-dark.svg', horizontalLockup(DARK)],
  ['zefi-logo-horizontal-mono.svg', horizontalLockup(MONO)],
  ['zefi-logo-stacked-light.svg', stackedLockup(LIGHT)],
  ['zefi-logo-stacked-dark.svg', stackedLockup(DARK)],
  // Icons
  ['zefi-app-icon.svg', plateIcon(512, 0.2246, 6.4)],
  ['zefi-launch-icon-square.svg', plateIcon(1024, 0.2246, 12.8)],
  ['zefi-favicon.svg', svg('0 0 48 48', symbolBody(LIGHT, false))],
  ['zefi-avatar.svg', avatarCream(1000)],
  // Routefold
  ['routefold-symbol.svg', svg('0 0 48 48', routefoldBody(LIGHT))],
  ['routefold-symbol-dark-bg.svg', svg('0 0 48 48', routefoldBody(DARK))],
  ['routefold-logo-light.svg', routefoldLockupSvg(LIGHT)],
  ['routefold-logo-dark.svg', routefoldLockupSvg(DARK)],
]

async function main() {
  for (const dir of [SVG_DIR, PNG_DIR, PUBLIC_DIR]) mkdirSync(dir, { recursive: true })

  for (const [name, content] of files) {
    writeFileSync(join(SVG_DIR, name), content, 'utf8')
  }
  console.log(`✓ ${files.length} SVG sources → launch-kit/svg`)

  // Runtime icons Next.js picks up by convention.
  writeFileSync(join(APP_DIR, 'icon.svg'), svg('0 0 48 48', symbolBody(LIGHT, false)), 'utf8')
  // Public copies so marketing pages and docs can hotlink stable paths.
  for (const name of [
    'zefi-logo-horizontal-light.svg',
    'zefi-logo-horizontal-dark.svg',
    'zefi-symbol.svg',
    'routefold-logo-light.svg',
  ]) {
    const found = files.find(([n]) => n === name)
    if (found) writeFileSync(join(PUBLIC_DIR, name), found[1], 'utf8')
  }

  const raster: Array<[string, string, number, number?]> = [
    ['zefi-app-icon-1024.png', plateIcon(1024, 0.2246, 12.8), 1024],
    ['zefi-app-icon-512.png', plateIcon(512, 0.2246, 6.4), 512],
    ['zefi-apple-touch-180.png', plateIcon(180, 0.2246, 2.25), 180],
    ['zefi-favicon-32.png', svg('0 0 48 48', symbolBody(LIGHT, false)), 32],
    ['zefi-favicon-16.png', svg('0 0 48 48', symbolBody(LIGHT, false)), 16],
    ['zefi-avatar-1000.png', avatarCream(1000), 1000],
    ['zefi-avatar-400.png', avatarCream(400), 400],
    ['zefi-logo-horizontal-light-1200.png', horizontalLockup(LIGHT), 1200, 514],
    ['zefi-logo-horizontal-dark-1200.png', horizontalLockup(DARK), 1200, 514],
    ['zefi-symbol-512.png', svg('0 0 48 48', symbolBody(LIGHT)), 512],
    ['routefold-symbol-512.png', svg('0 0 48 48', routefoldBody(LIGHT)), 512],
  ]

  for (const [name, source, width, height] of raster) {
    const image = sharp(Buffer.from(source), { density: 400 }).resize({
      width,
      ...(height ? { height } : {}),
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    await image.png({ compressionLevel: 9 }).toFile(join(PNG_DIR, name))
  }
  console.log(`✓ ${raster.length} PNGs → launch-kit/png`)

  // Apple touch icon at the Next.js convention path.
  await sharp(Buffer.from(plateIcon(180, 0.2246, 2.25)), { density: 400 })
    .resize(180, 180)
    .png()
    .toFile(join(APP_DIR, 'apple-icon.png'))
  console.log('✓ app/icon.svg + app/apple-icon.png')

  // Contact sheet for visual QA of the mark at every size it ships at.
  const sheet = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 980 560" fill="none">
  <rect width="980" height="560" fill="#F6EAD9"/>
  <g transform="translate(40 30)">${symbolBody(LIGHT)}</g>
  <g transform="translate(112 38) scale(0.6667)">${symbolBody(LIGHT)}</g>
  <g transform="translate(172 44) scale(0.5)">${symbolBody(LIGHT)}</g>
  <g transform="translate(212 48) scale(0.3333)">${symbolBody(LIGHT)}</g>
  <g transform="translate(242 52) scale(0.25)">${symbolBody(LIGHT, false)}</g>
  <g transform="translate(40 100) scale(2.6)">${symbolBody(LIGHT)}</g>
  <g transform="translate(190 112) scale(1.25)">${wordmarkBody(LIGHT)}</g>
  <g transform="translate(40 260) scale(2.2)">${horizontalLockup(LIGHT).replace(/<\/?svg[^>]*>/g, '')}</g>
  <g transform="translate(40 340) scale(1.3)">${horizontalLockup(LIGHT).replace(/<\/?svg[^>]*>/g, '')}</g>
  <g transform="translate(40 400) scale(2.2)">${routefoldBody(LIGHT)}</g>
  <g transform="translate(190 424) scale(1.2)">${routefoldBody(LIGHT)}</g>
  <g transform="translate(270 434) scale(0.7)">${routefoldBody(LIGHT)}</g>
  <g transform="translate(600 30) scale(0.32)">${plateIcon(512, 0.2246, 6.4).replace(/<svg[^>]*>|<\/svg>/g, '')}</g>
  <g transform="translate(790 30) scale(0.15)">${avatarCream(1000).replace(/<svg[^>]*>|<\/svg>/g, '')}</g>
  <rect x="540" y="230" width="400" height="290" rx="20" fill="#0F172A"/>
  <g transform="translate(566 280) scale(2.4)">${horizontalLockup(DARK).replace(/<\/?svg[^>]*>/g, '')}</g>
  <g transform="translate(566 380) scale(2)">${symbolBody(DARK)}</g>
  <g transform="translate(690 380) scale(2)">${routefoldBody(DARK)}</g>
</svg>`
  await sharp(Buffer.from(sheet), { density: 220 }).resize({ width: 1500 }).png().toFile(join(PNG_DIR, '_contact-sheet.png'))
  console.log('✓ contact sheet → launch-kit/png/_contact-sheet.png')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
