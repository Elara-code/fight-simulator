#!/usr/bin/env node
// Rasterize public/og-cover.svg -> public/og-cover.png (1200x630).
// Runs at prebuild so the PNG is always in sync with the SVG source.
// Twitter / Slack / some WeChat flows prefer PNG over SVG for preview.

import { readFileSync, writeFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SRC = path.join(ROOT, 'public', 'og-cover.svg')
const OUT = path.join(ROOT, 'public', 'og-cover.png')

// CI / Docker may not have Noto Sans SC. Swap the font-family hint to a stack
// that includes WenQuanYi Zen Hei + Sans fallbacks so CJK glyphs still render.
function coerceFontStack(svg) {
  return svg.replace(
    /font-family="'Noto Sans SC', sans-serif"/g,
    `font-family="Noto Sans SC, WenQuanYi Zen Hei, Noto Sans CJK SC, sans-serif"`,
  )
}

async function main() {
  const svg = coerceFontStack(readFileSync(SRC, 'utf8'))
  const png = await sharp(Buffer.from(svg), { density: 144 })
    .resize(1200, 630, { fit: 'fill' })
    .png({ compressionLevel: 9 })
    .toBuffer()
  writeFileSync(OUT, png)
  const kb = (statSync(OUT).size / 1024).toFixed(1)
  console.log(`og-cover.png rendered — ${kb} KiB at 1200x630`)
}

main().catch((err) => {
  console.error('og-cover rasterize failed:', err)
  process.exit(1)
})
