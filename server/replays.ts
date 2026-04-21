import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { getDb } from './db.js'
import { StyleKey } from './generate.js'

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
})
export type ReplayInput = z.infer<typeof ReplayInput>

export type Replay = ReplayInput & {
  id: string
  createdAt: number
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
}

function rowToReplay(row: Row): Replay {
  return {
    id: row.id,
    them: row.them,
    me: row.me,
    dialog: JSON.parse(row.dialog),
    style: row.style,
    createdAt: row.created_at,
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
  getDb()
    .prepare(
      `INSERT INTO replays (id, them, me, dialog, style, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(id, input.them, input.me, JSON.stringify(input.dialog), input.style, now)
  return { ...input, id, createdAt: now }
}

export function getReplay(id: string): Replay | undefined {
  const row = getDb()
    .prepare(
      `SELECT id, them, me, dialog, style, created_at, report_count, removed
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
