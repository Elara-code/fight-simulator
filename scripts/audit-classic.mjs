#!/usr/bin/env node
// Sample-audit the "classic" reply style. Hits the local /api/generate
// endpoint with the test cases in audit-classic.cases.json and dumps a
// timestamped JSON+markdown report for manual scoring.
//
// Usage:
//   1. Start the server:  DEEPSEEK_API_KEY=sk-... npm run dev:api
//   2. In another shell:  node scripts/audit-classic.mjs
//   3. Open the printed report path and grade each output with the rubric
//      below.
//
// Optional env:
//   API_BASE    default http://localhost:8787
//   RUNS        how many times to ask each case (default 1; bump to 3-5
//               when you want to see variance per input)
//   CONCURRENCY parallel requests (default 2 — respect per-IP rate limit)

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const API_BASE = process.env.API_BASE ?? 'http://localhost:8787'
const RUNS = Number(process.env.RUNS ?? 1)
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 2)

const cases = JSON.parse(
  await readFile(join(__dirname, 'audit-classic.cases.json'), 'utf8'),
)

async function generate(text, relation) {
  const t0 = Date.now()
  const res = await fetch(`${API_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, relation, style: 'classic' }),
  })
  const ms = Date.now() - t0
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    return { ok: false, status: res.status, body, ms }
  }
  const payload = await res.json()
  return { ok: true, ms, payload }
}

async function pool(items, n, worker) {
  const q = items.slice()
  const out = []
  async function next() {
    while (q.length) {
      const item = q.shift()
      out.push(await worker(item))
    }
  }
  await Promise.all(Array.from({ length: n }, next))
  return out
}

const jobs = cases.flatMap((c) =>
  Array.from({ length: RUNS }, (_, i) => ({ ...c, run: i + 1 })),
)

console.error(
  `audit-classic: ${cases.length} cases × ${RUNS} runs = ${jobs.length} requests`,
)

const results = await pool(jobs, CONCURRENCY, async (job) => {
  const r = await generate(job.text, job.relation)
  process.stderr.write(r.ok ? '.' : 'x')
  return { case: job, result: r }
})
process.stderr.write('\n')

// --- emit ---
const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const outDir = join(__dirname, 'audit-out')
await mkdir(outDir, { recursive: true })

const jsonPath = join(outDir, `classic-${ts}.json`)
await writeFile(jsonPath, JSON.stringify(results, null, 2))

// Markdown report — easy to skim, has a row per (case, run) plus an empty
// score column you fill in by hand.
const md = []
md.push(`# Classic mode audit — ${ts}`)
md.push('')
md.push('## How to grade')
md.push('Score each output 0/0.5/1 on every dimension. 1 = clearly passes.')
md.push('')
md.push('| Dimension | What to look for |')
md.push('|---|---|')
md.push('| Quote real? | Can you Google the quote and find the real source? Half-credit if attribution is wrong but the line is real. |')
md.push('| On-topic | Does the quote connect to the situation, or is it dropped in for show? |')
md.push('| Has 锋芒 | Is there a 白话 punchline after the quote that actually 戳 to 对方? Not just elegant words. |')
md.push('| Voice consistent | Does the dialog follow-up keep the classical register, or does it drift to savage? |')
md.push('| No 掉书袋 | Reads natural, not "I memorized 100 idioms" pastiche? |')
md.push('')
md.push('Below 4/5 across the sample = prompt needs work.')
md.push('')

for (const { case: c, result } of results) {
  md.push(`## ${c.id}${RUNS > 1 ? ` · run ${c.run}` : ''}`)
  md.push(`- **relation**: \`${c.relation}\``)
  md.push(`- **对方**: ${c.text}`)
  if (!result.ok) {
    md.push(`- ❌ **HTTP ${result.status}** — \`${result.body.slice(0, 200)}\``)
    md.push('')
    continue
  }
  const r = result.payload
  md.push(`- **latency**: ${result.ms} ms`)
  md.push(`- **score / verdict**: ${r.score} / ${r.verdict}`)
  md.push(`- **highlight**: ${r.highlight}`)
  md.push('')
  md.push('**主反击 (me):**')
  md.push('```')
  md.push(r.me)
  md.push('```')
  if (r.dialog?.length) {
    md.push('')
    md.push('**对吵:**')
    for (const turn of r.dialog) {
      md.push(`- 对方：${turn.them}`)
      md.push(`- 我：${turn.me}`)
    }
  }
  md.push('')
  md.push('**Grade:** quote-real ☐  on-topic ☐  has-锋芒 ☐  voice-consistent ☐  no-掉书袋 ☐')
  md.push('')
  md.push('**Quote source you verified (or "fabricated"):**')
  md.push('')
  md.push('---')
}

const mdPath = join(outDir, `classic-${ts}.md`)
await writeFile(mdPath, md.join('\n'))

const okCount = results.filter((r) => r.result.ok).length
console.error(`\n✓ ${okCount}/${results.length} requests succeeded`)
console.error(`\nReports:`)
console.error(`  json: ${jsonPath}`)
console.error(`  md:   ${mdPath}\n`)
