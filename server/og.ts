import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Replay } from './replays.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST_INDEX_PATH = path.resolve(__dirname, '..', 'dist', 'index.html')

const FALLBACK_SHELL = `<!doctype html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body><div id="root"></div></body></html>`

let cachedShell: string | null = null

function loadShell(): string {
  if (cachedShell !== null) return cachedShell
  try {
    cachedShell = readFileSync(DIST_INDEX_PATH, 'utf8')
  } catch {
    cachedShell = FALLBACK_SHELL
  }
  return cachedShell
}

const STYLE_LABEL: Record<Replay['style'], string> = {
  savage: '爽文反击',
  logic: '逻辑碾压',
  sarcasm: '阴阳怪气',
  calm: '冷静终结',
  classic: '腹有诗书',
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function snippet(s: string, max: number): string {
  const flat = s.replace(/\s+/g, ' ').trim()
  return flat.length > max ? flat.slice(0, max - 1) + '…' : flat
}

function stripExistingTags(html: string): string {
  return html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+name="description"[^>]*>/gi, '')
    .replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, '')
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>/gi, '')
}

export function renderReplayHtml(replay: Replay, origin: string): string {
  const shell = loadShell()
  const styleLabel = STYLE_LABEL[replay.style] ?? '反击'
  const them = snippet(replay.them, 40)
  const me = snippet(replay.me, 80)
  const title = `${styleLabel} · 吵架回放`
  const description = `对方：${them}｜我：${me}`
  const url = `${origin}/r/${replay.id}`
  const image = `${origin}/og-cover.png`

  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
  ].join('\n    ')

  const stripped = stripExistingTags(shell)
  if (stripped.includes('</head>')) {
    return stripped.replace('</head>', `    ${tags}\n  </head>`)
  }
  return stripped.replace('<head>', `<head>\n    ${tags}`)
}

export function renderDefaultShell(): string {
  return loadShell()
}
