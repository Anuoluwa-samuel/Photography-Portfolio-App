const { db } = require('../config/database');
const { safeJson } = require('../utils/text');

module.exports = {
  async all(activeOnly = false) {
    const rows = await db.prepare(`SELECT * FROM services ${activeOnly ? 'WHERE active = 1' : ''} ORDER BY sort, id`).all();
    return rows.map(r => ({ ...r, includes: safeJson(r.includes, []) }));
  },
  async get(id) {
    const r = await db.prepare('SELECT * FROM services WHERE id = ?').get(id);
    return r && { ...r, includes: safeJson(r.includes, []) };
  },
  async create(s) {
    const { m } = await db.prepare('SELECT COALESCE(MAX(sort), -1) AS m FROM services').get();
    const res = await db.prepare('INSERT INTO services (name, icon, price, description, includes, cta, active, sort) VALUES (@name, @icon, @price, @description, @includes, @cta, @active, @sort)')
                        .run({ ...s, includes: JSON.stringify(s.includes || []), sort: m + 1 });
    return res.lastInsertRowid;
  },
  async update(id, s) {
    return db.prepare('UPDATE services SET name = @name, icon = @icon, price = @price, description = @description, includes = @includes, cta = @cta, active = @active WHERE id = @id')
             .run({ ...s, includes: JSON.stringify(s.includes || []), id });
  },
  async reorder(ids) {
    await db.batch(ids.map((id, i) => ({ sql: 'UPDATE services SET sort = ? WHERE id = ?', args: [i, id] })));
  },
  async remove(id) { return db.prepare('DELETE FROM services WHERE id = ?').run(id); },
};
