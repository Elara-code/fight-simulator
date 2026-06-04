import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { getDb } from './db.js'
import { Relation } from './generate.js'

// Used both at create time (challenger's own score) and at complete time
// (the opponent's score). 'win' / 'draw' / 'lose' is the same set TrainPage
// already uses, so we don't need a new vocabulary.
const TrainVerdict = z.enum(['win', 'draw', 'lose'])
type TrainVerdict = z.infer<typeof TrainVerdict>

export const ChallengeCreateInput = z.object({
  opening: z.string().min(1).max(300),
  relation: Relation,
  challengerScore: z.number().int().min(0).max(100),
  challengerVerdict: TrainVerdict,
  challengerName: z.string().min(1).max(20).optional(),
})
export type ChallengeCreateInput = z.infer<typeof ChallengeCreateInput>

export const ChallengeCompleteInput = z.object({
  opponentScore: z.number().int().min(0).max(100),
  opponentVerdict: TrainVerdict,
  opponentName: z.string().min(1).max(20).optional(),
})
export type ChallengeCompleteInput = z.infer<typeof ChallengeCompleteInput>

export type Challenge = {
  id: string
  opening: string
  relation: Relation
  challengerScore: number
  challengerVerdict: TrainVerdict
  challengerName?: string
  opponentScore?: number
  opponentVerdict?: TrainVerdict
  opponentName?: string
  opponentCompletedAt?: number
  createdAt: number
}

type Row = {
  id: string
  opening: string
  relation: Relation
  challenger_score: number
  challenger_verdict: TrainVerdict
  challenger_name: string | null
  opponent_score: number | null
  opponent_verdict: TrainVerdict | null
  opponent_name: string | null
  opponent_completed_at: number | null
  created_at: number
  removed: number
}

const TTL_MS = 7 * 24 * 60 * 60 * 1000

function rowToChallenge(row: Row): Challenge {
  return {
    id: row.id,
    opening: row.opening,
    relation: row.relation,
    challengerScore: row.challenger_score,
    challengerVerdict: row.challenger_verdict,
    challengerName: row.challenger_name ?? undefined,
    opponentScore: row.opponent_score ?? undefined,
    opponentVerdict: row.opponent_verdict ?? undefined,
    opponentName: row.opponent_name ?? undefined,
    opponentCompletedAt: row.opponent_completed_at ?? undefined,
    createdAt: row.created_at,
  }
}

function newId(): string {
  return randomBytes(8).toString('base64url')
}

function purgeExpired(now: number) {
  getDb()
    .prepare('DELETE FROM challenges WHERE created_at < ?')
    .run(now - TTL_MS)
}

export function createChallenge(input: ChallengeCreateInput): Challenge {
  const now = Date.now()
  purgeExpired(now)
  const id = newId()
  getDb()
    .prepare(
      `INSERT INTO challenges (
         id, opening, relation, challenger_score, challenger_verdict,
         challenger_name, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.opening,
      input.relation,
      input.challengerScore,
      input.challengerVerdict,
      input.challengerName ?? null,
      now,
    )
  return {
    id,
    opening: input.opening,
    relation: input.relation,
    challengerScore: input.challengerScore,
    challengerVerdict: input.challengerVerdict,
    challengerName: input.challengerName,
    createdAt: now,
  }
}

export function getChallenge(id: string): Challenge | undefined {
  const row = getDb()
    .prepare(
      `SELECT id, opening, relation, challenger_score, challenger_verdict,
              challenger_name, opponent_score, opponent_verdict, opponent_name,
              opponent_completed_at, created_at, removed
       FROM challenges WHERE id = ?`,
    )
    .get(id) as Row | undefined
  if (!row) return undefined
  if (row.removed === 1) return undefined
  if (Date.now() - row.created_at > TTL_MS) {
    getDb().prepare('DELETE FROM challenges WHERE id = ?').run(id)
    return undefined
  }
  return rowToChallenge(row)
}

type CompleteResult =
  | { ok: true; challenge: Challenge }
  | { ok: false; code: 'not_found' | 'already_completed' }

export function completeChallenge(
  id: string,
  input: ChallengeCompleteInput,
): CompleteResult {
  const existing = getChallenge(id)
  if (!existing) return { ok: false, code: 'not_found' }
  if (existing.opponentScore !== undefined) {
    return { ok: false, code: 'already_completed' }
  }
  const now = Date.now()
  getDb()
    .prepare(
      `UPDATE challenges
       SET opponent_score = ?, opponent_verdict = ?, opponent_name = ?,
           opponent_completed_at = ?
       WHERE id = ?`,
    )
    .run(
      input.opponentScore,
      input.opponentVerdict,
      input.opponentName ?? null,
      now,
      id,
    )
  return {
    ok: true,
    challenge: {
      ...existing,
      opponentScore: input.opponentScore,
      opponentVerdict: input.opponentVerdict,
      opponentName: input.opponentName,
      opponentCompletedAt: now,
    },
  }
}
