const { db, DEFAULT_SETTINGS } = require('../config/database');

module.exports = {
  all() {
    const out = {};
    for (const r of db.prepare('SELECT key, value FROM settings').all()) out[r.key] = r.value;
    return out;
  },
  get(key) { return db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value ?? ''; },
  set(key, value) { db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, String(value ?? '')); },
  setMany(obj) { db.transaction(() => { for (const [k, v] of Object.entries(obj)) module.exports.set(k, v); })(); },
  keys() { return Object.keys(DEFAULT_SETTINGS); },
};
