import type { Relation, Reply, StyleKey } from './api'

export type HistoryEntry = {
  id: string
  text: string
  relation: Relation
  replies: Partial<Record<StyleKey, Reply>>
  createdAt: number
}

const KEY = 'fightsim.history.v1'
const MAX_ENTRIES = 50

function safeParse(raw: string | null): HistoryEntry[] {
  if (!raw) return []
  try {
    const v = JSON.parse(raw)
    return Array.isArray(v) ? (v as HistoryEntry[]) : []
  } catch {
    return []
  }
}

function read(): HistoryEntry[] {
  if (typeof window === 'undefined') return []
  return safeParse(window.localStorage.getItem(KEY))
}

function write(entries: HistoryEntry[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries))
  } catch {
    /* quota exceeded / private mode — swallow */
  }
}

export function listEntries(): HistoryEntry[] {
  return read().sort((a, b) => b.createdAt - a.createdAt)
}

export function getEntry(id: string): HistoryEntry | undefined {
  return read().find((e) => e.id === id)
}

export function upsertEntry(entry: HistoryEntry) {
  const entries = read().filter((e) => e.id !== entry.id)
  entries.unshift(entry)
  if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES
  write(entries)
}

export function updateReplies(
  id: string,
  patch: Partial<Record<StyleKey, Reply>>,
) {
  const entries = read()
  const idx = entries.findIndex((e) => e.id === id)
  if (idx < 0) return
  entries[idx] = {
    ...entries[idx],
    replies: { ...entries[idx].replies, ...patch },
  }
  write(entries)
}

export function deleteEntry(id: string) {
  write(read().filter((e) => e.id !== id))
}

export function clearHistory() {
  write([])
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
