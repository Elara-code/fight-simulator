import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resetDbForTests } from './db'
import {
  adminRemoveReplay,
  createReplay,
  getReplay,
  listPublicFeed,
  replayCount,
  ReplayInput,
  reportReplay,
  scorePercentile,
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
    // No score provided — should come back undefined, not 0 or null.
    expect(got?.score).toBeUndefined()
    expect(got?.verdict).toBeUndefined()
    expect(got?.highlight).toBeUndefined()
  })

  it('getReplay round-trips score/verdict/highlight when provided', () => {
    const created = createReplay({
      them: 'a',
      me: 'b',
      dialog: [{ them: 'c', me: 'd' }],
      style: 'savage',
      score: 87,
      verdict: '碾压',
      highlight: '这句最狠',
    })
    const got = getReplay(created.id)
    expect(got?.score).toBe(87)
    expect(got?.verdict).toBe('碾压')
    expect(got?.highlight).toBe('这句最狠')
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

  it('defaults isPublic to false and stores it when set', () => {
    const priv = createReplay({
      them: 'a',
      me: 'b',
      dialog: [{ them: 'c', me: 'd' }],
      style: 'savage',
    })
    expect(priv.isPublic).toBe(false)
    const pub = createReplay({
      them: 'a',
      me: 'b',
      dialog: [{ them: 'c', me: 'd' }],
      style: 'savage',
      isPublic: true,
    })
    expect(pub.isPublic).toBe(true)
    const roundTrip = getReplay(pub.id)
    expect(roundTrip?.isPublic).toBe(true)
  })

  it('feed only includes public, non-removed, non-expired entries', () => {
    createReplay({
      them: 'private',
      me: 'x',
      dialog: [{ them: 'c', me: 'd' }],
      style: 'savage',
    })
    const pub = createReplay({
      them: 'public',
      me: 'y',
      dialog: [{ them: 'c', me: 'd' }],
      style: 'logic',
      isPublic: true,
    })
    const reported = createReplay({
      them: 'spammy',
      me: 'z',
      dialog: [{ them: 'c', me: 'd' }],
      style: 'sarcasm',
      isPublic: true,
    })
    reportReplay(reported.id)
    reportReplay(reported.id)
    reportReplay(reported.id) // auto-removed at 3

    const feed = listPublicFeed()
    expect(feed.map((f) => f.id)).toEqual([pub.id])
  })

  it('feed orders newest first', async () => {
    const a = createReplay({
      them: 'a',
      me: 'x',
      dialog: [{ them: 'c', me: 'd' }],
      style: 'savage',
      isPublic: true,
    })
    await new Promise((r) => setTimeout(r, 5))
    const b = createReplay({
      them: 'b',
      me: 'y',
      dialog: [{ them: 'c', me: 'd' }],
      style: 'logic',
      isPublic: true,
    })
    const feed = listPublicFeed()
    expect(feed.map((f) => f.id)).toEqual([b.id, a.id])
  })

  describe('scorePercentile', () => {
    function seed(scores: number[]) {
      for (const s of scores) {
        createReplay({
          them: 't',
          me: 'm',
          dialog: [{ them: 'a', me: 'b' }],
          style: 'savage',
          score: s,
          verdict: '完胜',
        })
      }
    }

    it('returns null when the sample is too small to anchor on', () => {
      seed([60, 70, 80])
      expect(scorePercentile(75)).toBeNull()
    })

    it('returns a percentile and sample size once we have enough data', () => {
      const scores = Array.from({ length: 25 }, (_, i) => i * 4) // 0..96
      seed(scores)
      const r = scorePercentile(60)
      expect(r).not.toBeNull()
      expect(r!.sample).toBe(25)
      // 15 of 25 are < 60 → 60%
      expect(r!.percentile).toBe(60)
    })

    it('ignores removed and unscored replays', () => {
      const scores = Array.from({ length: 30 }, (_, i) => 50 + i) // 50..79
      seed(scores)
      // One unscored replay shouldn't count toward total
      createReplay({
        them: 'x',
        me: 'y',
        dialog: [{ them: 'a', me: 'b' }],
        style: 'savage',
      })
      const r = scorePercentile(70)
      expect(r!.sample).toBe(30)
    })
  })
})
