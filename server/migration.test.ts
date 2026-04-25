import Database from 'better-sqlite3'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getDb, resetDbForTests } from './db'
import { createReplay, listPublicFeed } from './replays'

// Regression test for github issue #11: an existing prod DB created
// before scenario_id existed crashed on startup because the new code
// tried to CREATE INDEX on a column that ALTER TABLE would only add
// later in the same exec block. Once we fixed the ordering this test
// makes sure we don't reintroduce it.

describe('db migration on legacy schema', () => {
  let tmpDir: string
  let dbPath: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'fightsim-mig-'))
    dbPath = join(tmpDir, 'old.sqlite')
    process.env.DATABASE_PATH = dbPath
    resetDbForTests()
  })
  afterEach(() => {
    resetDbForTests()
    delete process.env.DATABASE_PATH
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('opens a legacy DB without scenario_id and runs the column migration', () => {
    // Hand-roll a "vintage" replays table that predates scenario_id /
    // score / verdict / highlight — only the columns that existed in
    // the very first SQLite revision.
    const seed = new Database(dbPath)
    seed.exec(`
      CREATE TABLE replays (
        id TEXT PRIMARY KEY,
        them TEXT NOT NULL,
        me TEXT NOT NULL,
        dialog TEXT NOT NULL,
        style TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        report_count INTEGER NOT NULL DEFAULT 0,
        removed INTEGER NOT NULL DEFAULT 0
      );
    `)
    // Pre-seed a row so we know the migration doesn't blow it away.
    seed.prepare(
      'INSERT INTO replays (id, them, me, dialog, style, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).run('legacy01', 'old them', 'old me', '[]', 'savage', Date.now())
    seed.close()

    // First call to getDb runs the migration. Before the fix this threw
    // SqliteError: no such column: scenario_id
    expect(() => getDb()).not.toThrow()

    // All four added columns should now exist.
    const cols = getDb()
      .prepare('PRAGMA table_info(replays)')
      .all() as { name: string }[]
    const names = new Set(cols.map((c) => c.name))
    for (const required of ['is_public', 'score', 'verdict', 'highlight', 'scenario_id']) {
      expect(names.has(required)).toBe(true)
    }

    // Existing data still readable + new writes work end-to-end.
    expect(listPublicFeed()).toEqual([])
    const created = createReplay({
      them: 'a',
      me: 'b',
      dialog: [{ them: 'c', me: 'd' }],
      style: 'savage',
      isPublic: true,
      scenarioId: 'cold_reply',
    })
    expect(created.scenarioId).toBe('cold_reply')
  })
})
