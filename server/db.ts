import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import Database from 'better-sqlite3'

let dbInstance: Database.Database | null = null

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance
  const path = process.env.DATABASE_PATH || './data/fightsim.sqlite'
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true })
  }
  const db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS replays (
      id TEXT PRIMARY KEY,
      them TEXT NOT NULL,
      me TEXT NOT NULL,
      dialog TEXT NOT NULL,
      style TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      report_count INTEGER NOT NULL DEFAULT 0,
      removed INTEGER NOT NULL DEFAULT 0,
      is_public INTEGER NOT NULL DEFAULT 0,
      score INTEGER,
      verdict TEXT,
      highlight TEXT,
      scenario_id TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_replays_created_at ON replays(created_at);
    CREATE INDEX IF NOT EXISTS idx_replays_removed ON replays(removed);
    CREATE INDEX IF NOT EXISTS idx_replays_public ON replays(is_public, removed, created_at);
    CREATE INDEX IF NOT EXISTS idx_replays_scenario ON replays(scenario_id, is_public, removed, score);
  `)

  // Idempotent migrations for installs that predate newer columns.
  const cols = db
    .prepare('PRAGMA table_info(replays)')
    .all() as { name: string }[]
  const existing = new Set(cols.map((c) => c.name))
  if (!existing.has('is_public')) {
    db.exec(
      'ALTER TABLE replays ADD COLUMN is_public INTEGER NOT NULL DEFAULT 0',
    )
  }
  if (!existing.has('score')) {
    db.exec('ALTER TABLE replays ADD COLUMN score INTEGER')
  }
  if (!existing.has('verdict')) {
    db.exec('ALTER TABLE replays ADD COLUMN verdict TEXT')
  }
  if (!existing.has('highlight')) {
    db.exec('ALTER TABLE replays ADD COLUMN highlight TEXT')
  }
  if (!existing.has('scenario_id')) {
    db.exec('ALTER TABLE replays ADD COLUMN scenario_id TEXT')
    db.exec(
      'CREATE INDEX IF NOT EXISTS idx_replays_scenario ON replays(scenario_id, is_public, removed, score)',
    )
  }

  dbInstance = db
  return db
}

// For tests — reset module-level cache so fresh DBs can be opened per test.
export function resetDbForTests() {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}

// Called during graceful shutdown. Safe to call even if db was never opened.
export function closeDb() {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}
