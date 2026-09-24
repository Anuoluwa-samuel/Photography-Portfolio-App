const { db } = require('../config/database');

module.exports = {
  async all()        { return db.prepare('SELECT * FROM categories ORDER BY sort, id').all(); },
  async allActive()  { return db.prepare('SELECT * FROM categories WHERE active = 1 ORDER BY sort, id').all(); },
  async get(id)      { return db.prepare('SELECT * FROM categories WHERE id = ?').get(id); },
  async bySlug(slug) { return db.prepare('SELECT * FROM categories WHERE slug = ?').get(slug); },
  async create(c) {
    const { m } = await db.prepare('SELECT COALESCE(MAX(sort), -1) AS m FROM categories').get();
    const res = await db.prepare('INSERT INTO categories (slug, label, active, sort) VALUES (@slug, @label, @active, @sort)')
                        .run({ active: 1, ...c, sort: m + 1 });
    return res.lastInsertRowid;
  },
  async update(id, c) {
    return db.prepare('UPDATE categories SET slug = @slug, label = @label, active = @active WHERE id = @id').run({ ...c, id });
  },
  async reorder(ids) {
    await db.batch(ids.map((id, i) => ({ sql: 'UPDATE categories SET sort = ? WHERE id = ?', args: [i, id] })));
  },
  async remove(id) {
    await db.prepare('UPDATE projects SET category_id = NULL WHERE category_id = ?').run(id);
    return db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  },
  async inUseCount(id) {
    const { n } = await db.prepare('SELECT COUNT(*) AS n FROM projects WHERE category_id = ?').get(id);
    return n;
  },
};
