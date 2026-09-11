const { db } = require('../config/database');

module.exports = {
  all(status) {
    return status
      ? db.prepare('SELECT * FROM enquiries WHERE status = ? ORDER BY created_at DESC').all(status)
      : db.prepare('SELECT * FROM enquiries ORDER BY created_at DESC').all();
  },
  counts() {
    const out = { total: 0 };
    for (const r of db.prepare('SELECT status, COUNT(*) AS n FROM enquiries GROUP BY status').all()) { out[r.status] = r.n; out.total += r.n; }
    return out;
  },
  get(id) { return db.prepare('SELECT * FROM enquiries WHERE id = ?').get(id); },
  create(e) {
    return db.prepare(`INSERT INTO enquiries (name, email, phone, service, preferred_date, message, ip)
                       VALUES (@name, @email, @phone, @service, @preferred_date, @message, @ip)`).run(e).lastInsertRowid;
  },
  setStatus(id, status) { return db.prepare('UPDATE enquiries SET status = ? WHERE id = ?').run(status, id); },
  remove(id) { return db.prepare('DELETE FROM enquiries WHERE id = ?').run(id); },
};
