import { randomBytes } from 'node:crypto'
import { z } from 'zod'
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

const TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const MAX_ENTRIES = 5000

const store = new Map<string, Replay>()

function sweepExpired(now: number) {
  for (const [id, r] of store) {
    if (now - r.createdAt > TTL_MS) store.delete(id)
  }
}

function evictOldestIfFull() {
  if (store.size < MAX_ENTRIES) return
  let oldestKey: string | null = null
  let oldestTs = Infinity
  for (const [id, r] of store) {
    if (r.createdAt < oldestTs) {
      oldestTs = r.createdAt
      oldestKey = id
    }
  }
  if (oldestKey) store.delete(oldestKey)
}

function newId(): string {
  return randomBytes(8).toString('base64url')
}

export function createReplay(input: ReplayInput): Replay {
  const now = Date.now()
  sweepExpired(now)
  evictOldestIfFull()
  const replay: Replay = { ...input, id: newId(), createdAt: now }
  store.set(replay.id, replay)
  return replay
}

export function getReplay(id: string): Replay | undefined {
  const r = store.get(id)
  if (!r) return undefined
  if (Date.now() - r.createdAt > TTL_MS) {
    store.delete(id)
    return undefined
  }
  return r
}

export function replayCount(): number {
  return store.size
}
