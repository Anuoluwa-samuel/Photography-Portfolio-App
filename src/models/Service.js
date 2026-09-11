const { db } = require('../config/database');
const { safeJson } = require('../utils/text');

module.exports = {
  all(activeOnly = false) {
    const rows = db.prepare(`SELECT * FROM services ${activeOnly ? 'WHERE active = 1' : ''} ORDER BY sort, id`).all();
    return rows.map(r => ({ ...r, includes: safeJson(r.includes, []) }));
  },
  get(id) { const r = db.prepare('SELECT * FROM services WHERE id = ?').get(id); return r && { ...r, includes: safeJson(r.includes, []) }; },
  create(s) {
    const sort = (db.prepare('SELECT COALESCE(MAX(sort), -1) AS m FROM services').get().m) + 1;
    return db.prepare('INSERT INTO services (name, icon, price, description, includes, cta, active, sort) VALUES (@name, @icon, @price, @description, @includes, @cta, @active, @sort)')
             .run({ ...s, includes: JSON.stringify(s.includes || []), sort }).lastInsertRowid;
  },
  update(id, s) {
    return db.prepare('UPDATE services SET name = @name, icon = @icon, price = @price, description = @description, includes = @includes, cta = @cta, active = @active WHERE id = @id')
             .run({ ...s, includes: JSON.stringify(s.includes || []), id });
  },
  reorder(ids) {
    const up = db.prepare('UPDATE services SET sort = ? WHERE id = ?');
    db.transaction(() => ids.forEach((id, i) => up.run(i, id)))();
  },
  remove(id) { return db.prepare('DELETE FROM services WHERE id = ?').run(id); },
};
