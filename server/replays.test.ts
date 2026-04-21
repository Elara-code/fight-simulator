import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resetDbForTests } from './db'
import {
  adminRemoveReplay,
  createReplay,
  getReplay,
  replayCount,
  ReplayInput,
  reportReplay,
} from './replays'

describe('replay store', () => {
  beforeEach(() => {
    process.env.DATABASE_PATH = ':memory:'
    resetDbForTests()
  })
  afterEach(() => {
    resetDbForTests()
    delete process.env.DATABASE_PATH
  })

  it('accepts a valid payload and returns an id', () => {
    const r = createReplay({
      them: '你怎么又忘了',
      me: '忘了是常态',
      dialog: [{ them: '别说', me: '就说' }],
      style: 'savage',
    })
    expect(r.id).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(r.createdAt).toBeLessThanOrEqual(Date.now())
  })

  it('getReplay round-trips the payload', () => {
    const created = createReplay({
      them: 'a',
      me: 'b',
      dialog: [{ them: 'c', me: 'd' }],
      style: 'logic',
    })
    const got = getReplay(created.id)
    expect(got?.them).toBe('a')
    expect(got?.me).toBe('b')
    expect(got?.dialog[0].me).toBe('d')
    expect(got?.style).toBe('logic')
  })

  it('getReplay returns undefined for missing id', () => {
    expect(getReplay('definitely-missing-id')).toBeUndefined()
  })

  it('Zod schema rejects invalid payloads', () => {
    expect(
      ReplayInput.safeParse({ them: '', me: 'b', dialog: [], style: 'savage' })
        .success,
    ).toBe(false)
    expect(
      ReplayInput.safeParse({ them: 'a', me: 'b', dialog: [], style: 'wat' })
        .success,
    ).toBe(false)
    expect(
      ReplayInput.safeParse({
        them: 'a',
        me: 'b',
        dialog: [{ them: 'c', me: 'd' }],
        style: 'savage',
      }).success,
    ).toBe(true)
  })

  it('Zod enforces length caps', () => {
    const tooLong = 'x'.repeat(700)
    expect(
      ReplayInput.safeParse({
        them: tooLong,
        me: 'b',
        dialog: [{ them: 'c', me: 'd' }],
        style: 'savage',
      }).success,
    ).toBe(false)
  })

  it('stores multiple entries independently', () => {
    const a = createReplay({
      them: 'x',
      me: 'y',
      dialog: [{ them: 'p', me: 'q' }],
      style: 'calm',
    })
    const b = createReplay({
      them: 'z',
      me: 'w',
      dialog: [{ them: 'r', me: 's' }],
      style: 'sarcasm',
    })
    expect(a.id).not.toBe(b.id)
    expect(replayCount()).toBe(2)
  })

  it('report increments count and auto-removes at threshold', () => {
    const r = createReplay({
      them: 'x',
      me: 'y',
      dialog: [{ them: 'p', me: 'q' }],
      style: 'savage',
    })
    const first = reportReplay(r.id)
    expect(first).toMatchObject({ ok: true, removed: false, reportCount: 1 })
    const second = reportReplay(r.id)
    expect(second).toMatchObject({ ok: true, removed: false, reportCount: 2 })
    const third = reportReplay(r.id)
    expect(third).toMatchObject({ ok: true, removed: true, reportCount: 3 })
    expect(getReplay(r.id)).toBeUndefined()
  })

  it('report on missing id returns not_found', () => {
    expect(reportReplay('no-such-id')).toEqual({ ok: false, code: 'not_found' })
  })

  it('admin remove soft-deletes the replay', () => {
    const r = createReplay({
      them: 'x',
      me: 'y',
      dialog: [{ them: 'p', me: 'q' }],
      style: 'savage',
    })
    expect(adminRemoveReplay(r.id)).toBe(true)
    expect(getReplay(r.id)).toBeUndefined()
    expect(adminRemoveReplay('no-such-id')).toBe(false)
  })
})
