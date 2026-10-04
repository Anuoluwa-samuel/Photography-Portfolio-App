// express-rate-limit store backed by the database, so every serverless instance shares one count.
//
// The default MemoryStore lives in a single instance's memory. On Vercel each instance kept its own
// count and a cold start reset it, so "10 logins per 15 minutes" was really 10 per instance per boot.
const { db } = require('../config/database');

// Created on first use rather than by `npm run db:init`, so deploying this needs no manual step.
// CREATE TABLE IF NOT EXISTS is safe to race across instances. Also listed in SCHEMA_SQL.
const CREATE_SQL = `CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  hits INTEGER NOT NULL,
  reset_at INTEGER NOT NULL
)`;
let ready = null;
const ensureTable = () => (ready ??= db.exec(CREATE_SQL).catch((err) => { ready = null; throw err; }));

// One atomic statement: start a fresh window if the old one expired, otherwise count the hit.
const INCREMENT_SQL = `
  INSERT INTO rate_limits (key, hits, reset_at) VALUES (@key, 1, @reset)
  ON CONFLICT(key) DO UPDATE SET
    hits     = CASE WHEN reset_at <= @now THEN 1 ELSE hits + 1 END,
    reset_at = CASE WHEN reset_at <= @now THEN @reset ELSE reset_at END
  RETURNING hits, reset_at`;

class DbStore {
  /** @param {string} prefix keeps each limiter's keys apart in the shared table, e.g. "login:" */
  constructor(prefix) {
    this.prefix = prefix;
    this.localKeys = false;
  }

  init(options) { this.windowMs = options.windowMs; }

  async increment(key) {
    await ensureTable();
    const now = Date.now();
    const row = await db.prepare(INCREMENT_SQL).get({ key: this.prefix + key, now, reset: now + this.windowMs });
    // Expired rows are only overwritten when the same client returns; sweep occasionally so the table stays small.
    if (Math.random() < 0.02) db.prepare('DELETE FROM rate_limits WHERE reset_at <= ?').run(now).catch(() => {});
    return { totalHits: row.hits, resetTime: new Date(row.reset_at) };
  }

  async decrement(key) {
    await ensureTable();
    await db.prepare('UPDATE rate_limits SET hits = MAX(hits - 1, 0) WHERE key = ?').run(this.prefix + key);
  }

  async resetKey(key) {
    await ensureTable();
    await db.prepare('DELETE FROM rate_limits WHERE key = ?').run(this.prefix + key);
  }
}

module.exports = { DbStore };
