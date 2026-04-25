import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resetDbForTests } from './db'
import {
  ChallengeCompleteInput,
  ChallengeCreateInput,
  completeChallenge,
  createChallenge,
  getChallenge,
} from './challenges'

describe('challenge store', () => {
  beforeEach(() => {
    process.env.DATABASE_PATH = ':memory:'
    resetDbForTests()
  })
  afterEach(() => {
    resetDbForTests()
    delete process.env.DATABASE_PATH
  })

  const sampleCreate: ChallengeCreateInput = {
    opening: '你最近怎么这么敷衍我？',
    relation: 'couple',
    challengerScore: 65,
    challengerVerdict: 'lose',
    challengerName: '我',
  }

  it('creates a challenge and returns an id + the input fields', () => {
    const c = createChallenge(sampleCreate)
    expect(c.id).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(c.opening).toBe(sampleCreate.opening)
    expect(c.challengerScore).toBe(65)
    expect(c.opponentScore).toBeUndefined()
  })

  it('round-trips through getChallenge', () => {
    const c = createChallenge(sampleCreate)
    const got = getChallenge(c.id)
    expect(got?.opening).toBe(sampleCreate.opening)
    expect(got?.challengerVerdict).toBe('lose')
    expect(got?.opponentScore).toBeUndefined()
  })

  it('completeChallenge fills in opponent fields and returns updated challenge', () => {
    const c = createChallenge(sampleCreate)
    const opponent: ChallengeCompleteInput = {
      opponentScore: 88,
      opponentVerdict: 'win',
      opponentName: 'TA',
    }
    const result = completeChallenge(c.id, opponent)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.challenge.opponentScore).toBe(88)
      expect(result.challenge.opponentVerdict).toBe('win')
      expect(result.challenge.opponentName).toBe('TA')
      expect(result.challenge.opponentCompletedAt).toBeGreaterThan(0)
    }
    // And it's persisted.
    expect(getChallenge(c.id)?.opponentScore).toBe(88)
  })

  it('refuses a second completion attempt on the same challenge', () => {
    const c = createChallenge(sampleCreate)
    completeChallenge(c.id, { opponentScore: 70, opponentVerdict: 'draw' })
    const second = completeChallenge(c.id, {
      opponentScore: 99,
      opponentVerdict: 'win',
    })
    expect(second.ok).toBe(false)
    if (!second.ok) expect(second.code).toBe('already_completed')
  })

  it('completing a missing challenge returns not_found', () => {
    const result = completeChallenge('missing-xxx', {
      opponentScore: 50,
      opponentVerdict: 'draw',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('not_found')
  })

  it('Zod schema rejects invalid create payloads', () => {
    expect(
      ChallengeCreateInput.safeParse({
        opening: '',
        relation: 'couple',
        challengerScore: 50,
        challengerVerdict: 'win',
      }).success,
    ).toBe(false)
    expect(
      ChallengeCreateInput.safeParse({
        opening: 'a',
        relation: 'couple',
        challengerScore: 150,
        challengerVerdict: 'win',
      }).success,
    ).toBe(false)
    expect(
      ChallengeCreateInput.safeParse({
        opening: 'a',
        relation: 'couple',
        challengerScore: 50,
        challengerVerdict: 'tie',
      }).success,
    ).toBe(false)
  })
})
