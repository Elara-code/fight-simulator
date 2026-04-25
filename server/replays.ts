import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { getDb } from './db.js'
import { StyleKey, Verdict } from './generate.js'

export const ReplayInput = z.object({
  them: z.string().min(1).max(600),
  me: z.string().min(1).max(1000),
  dialog: z
    .array(
      z.object({
        them: z.string().min(1).max(300),
        me: z.string().min(1).max(600),
      }),
    )
    .max(4),
  style: StyleKey,
  isPublic: z.boolean().optional(),
  score: z.number().int().min(0).max(100).optional(),
  verdict: Verdict.optional(),
  highlight: z.string().min(1).max(60).optional(),
  // Anchor to one of the predefined scenarios so ScenarioTopPage can
  // aggregate. Scenario IDs are short slugs the client owns (see
  // src/lib/scenarios.ts). null = user typed their own text.
  scenarioId: z
    .string()
    .regex(/^[a-z][a-z0-9_]{2,40}$/)
    .nullable()
    .optional(),
})
export type ReplayInput = z.infer<typeof ReplayInput>

export type Replay = Omit<ReplayInput, 'isPublic' | 'scenarioId'> & {
  id: string
  createdAt: number
  isPublic: boolean
  scenarioId?: string
}

export type FeedItem = {
  id: string
  them: string
  me: string
  style: Replay['style']
  createdAt: number
  score?: number
  verdict?: Verdict
}

const TTL_MS = 7 * 24 * 60 * 60 * 1000
const AUTO_REMOVE_REPORT_THRESHOLD = 3

type Row = {
  id: string
  them: string
  me: string
  dialog: string
  style: ReplayInput['style']
  created_at: number
  report_count: number
  removed: number
  is_public: number
  score: number | null
  verdict: Verdict | null
  highlight: string | null
  scenario_id: string | null
}

function rowToReplay(row: Row): Replay {
  return {
    id: row.id,
    them: row.them,
    me: row.me,
    dialog: JSON.parse(row.dialog),
    style: row.style,
    createdAt: row.created_at,
    isPublic: row.is_public === 1,
    score: row.score ?? undefined,
    verdict: row.verdict ?? undefined,
    highlight: row.highlight ?? undefined,
    scenarioId: row.scenario_id ?? undefined,
  }
}

function newId(): string {
  return randomBytes(8).toString('base64url')
}

function purgeExpired(now: number) {
  getDb()
    .prepare('DELETE FROM replays WHERE created_at < ?')
    .run(now - TTL_MS)
}

export function createReplay(input: ReplayInput): Replay {
  const now = Date.now()
  purgeExpired(now)
  const id = newId()
  const isPublic = input.isPublic ? 1 : 0
  getDb()
    .prepare(
      `INSERT INTO replays (id, them, me, dialog, style, created_at, is_public, score, verdict, highlight, scenario_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.them,
      input.me,
      JSON.stringify(input.dialog),
      input.style,
      now,
      isPublic,
      input.score ?? null,
      input.verdict ?? null,
      input.highlight ?? null,
      input.scenarioId ?? null,
    )
  return {
    them: input.them,
    me: input.me,
    dialog: input.dialog,
    style: input.style,
    id,
    createdAt: now,
    isPublic: isPublic === 1,
    score: input.score,
    verdict: input.verdict,
    highlight: input.highlight,
    scenarioId: input.scenarioId ?? undefined,
  }
}

export function getReplay(id: string): Replay | undefined {
  const row = getDb()
    .prepare(
      `SELECT id, them, me, dialog, style, created_at, report_count, removed, is_public, score, verdict, highlight, scenario_id
       FROM replays WHERE id = ?`,
    )
    .get(id) as Row | undefined
  if (!row) return undefined
  if (row.removed === 1) return undefined
  if (Date.now() - row.created_at > TTL_MS) {
    getDb().prepare('DELETE FROM replays WHERE id = ?').run(id)
    return undefined
  }
  return rowToReplay(row)
}

type ReportResult =
  | { ok: true; removed: boolean; reportCount: number }
  | { ok: false; code: 'not_found' }

export function reportReplay(id: string): ReportResult {
  const db = getDb()
  const row = db
    .prepare(
      'SELECT report_count, removed FROM replays WHERE id = ?',
    )
    .get(id) as { report_count: number; removed: number } | undefined
  if (!row) return { ok: false, code: 'not_found' }

  const nextCount = row.report_count + 1
  const shouldAutoRemove =
    row.removed === 0 && nextCount >= AUTO_REMOVE_REPORT_THRESHOLD
  db.prepare(
    `UPDATE replays
     SET report_count = ?, removed = ?
     WHERE id = ?`,
  ).run(nextCount, shouldAutoRemove ? 1 : row.removed, id)

  return {
    ok: true,
    removed: shouldAutoRemove || row.removed === 1,
    reportCount: nextCount,
  }
}

export function adminRemoveReplay(id: string): boolean {
  const info = getDb()
    .prepare('UPDATE replays SET removed = 1 WHERE id = ?')
    .run(id)
  return info.changes > 0
}

export function replayCount(): number {
  const row = getDb()
    .prepare('SELECT COUNT(*) AS n FROM replays WHERE removed = 0')
    .get() as { n: number }
  return row.n
}

export function listPublicFeed(limit = 30): FeedItem[] {
  const now = Date.now()
  const rows = getDb()
    .prepare(
      `SELECT id, them, me, style, created_at, score, verdict
       FROM replays
       WHERE is_public = 1 AND removed = 0 AND created_at > ?
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .all(now - TTL_MS, limit) as {
    id: string
    them: string
    me: string
    style: Replay['style']
    created_at: number
    score: number | null
    verdict: Verdict | null
  }[]
  return rows.map((r) => ({
    id: r.id,
    them: r.them,
    me: r.me,
    style: r.style,
    createdAt: r.created_at,
    score: r.score ?? undefined,
    verdict: r.verdict ?? undefined,
  }))
}

export type ScenarioTopItem = FeedItem & { highlight?: string }

// Returns top public replays for a given scenario, ordered by AI score
// desc then recency desc. Replays without a score fall to the bottom
// (they'll get displaced as new scored replays come in).
export function listScenarioTop(
  scenarioId: string,
  limit = 10,
): ScenarioTopItem[] {
  const now = Date.now()
  const rows = getDb()
    .prepare(
      `SELECT id, them, me, style, created_at, score, verdict, highlight
       FROM replays
       WHERE scenario_id = ?
         AND is_public = 1
         AND removed = 0
         AND created_at > ?
       ORDER BY score IS NULL, score DESC, created_at DESC
       LIMIT ?`,
    )
    .all(scenarioId, now - TTL_MS, limit) as {
    id: string
    them: string
    me: string
    style: Replay['style']
    created_at: number
    score: number | null
    verdict: Verdict | null
    highlight: string | null
  }[]
  return rows.map((r) => ({
    id: r.id,
    them: r.them,
    me: r.me,
    style: r.style,
    createdAt: r.created_at,
    score: r.score ?? undefined,
    verdict: r.verdict ?? undefined,
    highlight: r.highlight ?? undefined,
  }))
}
