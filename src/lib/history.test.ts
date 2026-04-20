import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  clearHistory,
  deleteEntry,
  getEntry,
  listEntries,
  newId,
  updateReplies,
  upsertEntry,
  type HistoryEntry,
} from './history'

function makeEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: overrides.id ?? newId(),
    text: overrides.text ?? '你怎么又忘了',
    relation: overrides.relation ?? 'couple',
    replies: overrides.replies ?? {},
    createdAt: overrides.createdAt ?? Date.now(),
  }
}

describe('history store', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  afterEach(() => {
    window.localStorage.clear()
  })

  it('returns empty list when storage is empty', () => {
    expect(listEntries()).toEqual([])
  })

  it('upsert + list returns entries in reverse-chronological order', () => {
    const older = makeEntry({ id: 'a', createdAt: 100 })
    const newer = makeEntry({ id: 'b', createdAt: 200 })
    upsertEntry(older)
    upsertEntry(newer)
    const list = listEntries()
    expect(list.map((e) => e.id)).toEqual(['b', 'a'])
  })

  it('upsert with existing id replaces the old entry', () => {
    const first = makeEntry({ id: 'x', text: 'v1', createdAt: 100 })
    upsertEntry(first)
    const second = makeEntry({ id: 'x', text: 'v2', createdAt: 200 })
    upsertEntry(second)
    const all = listEntries()
    expect(all).toHaveLength(1)
    expect(all[0].text).toBe('v2')
  })

  it('getEntry finds by id', () => {
    const e = makeEntry({ id: 'target' })
    upsertEntry(e)
    expect(getEntry('target')?.id).toBe('target')
    expect(getEntry('missing')).toBeUndefined()
  })

  it('evicts oldest when exceeding 50 entries (LRU cap)', () => {
    for (let i = 0; i < 55; i++) {
      upsertEntry(makeEntry({ id: `e${i}`, createdAt: i }))
    }
    const all = listEntries()
    expect(all).toHaveLength(50)
    expect(all[0].id).toBe('e54')
    expect(all[all.length - 1].id).toBe('e5')
  })

  it('updateReplies merges new replies without overwriting existing ones', () => {
    upsertEntry(
      makeEntry({
        id: 'm',
        replies: { savage: { me: 'A', dialog: [] } },
      }),
    )
    updateReplies('m', { logic: { me: 'B', dialog: [] } })
    const e = getEntry('m')!
    expect(e.replies.savage?.me).toBe('A')
    expect(e.replies.logic?.me).toBe('B')
  })

  it('updateReplies on a style already present overrides that style only', () => {
    upsertEntry(
      makeEntry({
        id: 'm',
        replies: { savage: { me: 'old', dialog: [] } },
      }),
    )
    updateReplies('m', { savage: { me: 'new', dialog: [] } })
    expect(getEntry('m')?.replies.savage?.me).toBe('new')
  })

  it('updateReplies is a no-op for unknown id', () => {
    updateReplies('ghost', { savage: { me: 'x', dialog: [] } })
    expect(listEntries()).toHaveLength(0)
  })

  it('deleteEntry removes only the matching id', () => {
    upsertEntry(makeEntry({ id: 'a' }))
    upsertEntry(makeEntry({ id: 'b' }))
    deleteEntry('a')
    const ids = listEntries().map((e) => e.id)
    expect(ids).toEqual(['b'])
  })

  it('clearHistory empties the store', () => {
    upsertEntry(makeEntry({ id: 'a' }))
    upsertEntry(makeEntry({ id: 'b' }))
    clearHistory()
    expect(listEntries()).toEqual([])
  })

  it('tolerates corrupted storage JSON', () => {
    window.localStorage.setItem('fightsim.history.v1', '{not json')
    expect(listEntries()).toEqual([])
  })

  it('newId produces unique-ish ids', () => {
    const ids = new Set(Array.from({ length: 20 }, () => newId()))
    expect(ids.size).toBe(20)
  })
})
