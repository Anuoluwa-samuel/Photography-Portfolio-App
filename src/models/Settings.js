const { db, DEFAULT_SETTINGS } = require('../config/database');

const UPSERT = 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value';

module.exports = {
  async all() {
    const out = {};
    for (const r of await db.prepare('SELECT key, value FROM settings').all()) out[r.key] = r.value;
    return out;
  },
  async get(key) {
    const row = await db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row?.value ?? '';
  },
  async set(key, value) { await db.prepare(UPSERT).run(key, String(value ?? '')); },
  async setMany(obj) {
    await db.batch(Object.entries(obj).map(([k, v]) => ({ sql: UPSERT, args: [k, String(v ?? '')] })));
  },
  keys() { return Object.keys(DEFAULT_SETTINGS); },
};
