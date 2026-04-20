import { describe, expect, it } from 'vitest'
import { createReplay, getReplay, replayCount, ReplayInput } from './replays'

describe('replay store', () => {
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
    const before = replayCount()
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
    expect(replayCount()).toBe(before + 2)
  })
})
