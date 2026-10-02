const { db } = require('../config/database');

module.exports = {
  async all(activeOnly = false) {
    return db.prepare(`SELECT * FROM testimonials ${activeOnly ? 'WHERE active = 1' : ''} ORDER BY sort, id`).all();
  },
  async get(id) { return db.prepare('SELECT * FROM testimonials WHERE id = ?').get(id); },
  async create(t) {
    const { m } = await db.prepare('SELECT COALESCE(MAX(sort), -1) AS m FROM testimonials').get();
    const res = await db.prepare('INSERT INTO testimonials (quote, name, meta, active, sort) VALUES (@quote, @name, @meta, @active, @sort)')
                        .run({ ...t, sort: m + 1 });
    return res.lastInsertRowid;
  },
  async update(id, t) {
    return db.prepare('UPDATE testimonials SET quote = @quote, name = @name, meta = @meta, active = @active WHERE id = @id').run({ ...t, id });
  },
  async setPhoto(id, url) { return db.prepare('UPDATE testimonials SET photo = ? WHERE id = ?').run(url, id); },
  async reorder(ids) {
    await db.batch(ids.map((id, i) => ({ sql: 'UPDATE testimonials SET sort = ? WHERE id = ?', args: [i, id] })));
  },
  async remove(id) { return db.prepare('DELETE FROM testimonials WHERE id = ?').run(id); },
};
