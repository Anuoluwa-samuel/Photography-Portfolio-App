const { db } = require('../config/database');

module.exports = {
  all()        { return db.prepare('SELECT * FROM categories ORDER BY sort, id').all(); },
  allActive()  { return db.prepare('SELECT * FROM categories WHERE active = 1 ORDER BY sort, id').all(); },
  get(id)      { return db.prepare('SELECT * FROM categories WHERE id = ?').get(id); },
  bySlug(slug) { return db.prepare('SELECT * FROM categories WHERE slug = ?').get(slug); },
  create(c) {
    const sort = (db.prepare('SELECT COALESCE(MAX(sort), -1) AS m FROM categories').get().m) + 1;
    return db.prepare('INSERT INTO categories (slug, label, active, sort) VALUES (@slug, @label, @active, @sort)')
             .run({ active: 1, ...c, sort }).lastInsertRowid;
  },
  update(id, c) {
    return db.prepare('UPDATE categories SET slug = @slug, label = @label, active = @active WHERE id = @id').run({ ...c, id });
  },
  reorder(ids) {
    const up = db.prepare('UPDATE categories SET sort = ? WHERE id = ?');
    db.transaction(() => ids.forEach((id, i) => up.run(i, id)))();
  },
  remove(id) {
    db.prepare('UPDATE projects SET category_id = NULL WHERE category_id = ?').run(id);
    return db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  },
  inUseCount(id) { return db.prepare('SELECT COUNT(*) AS n FROM projects WHERE category_id = ?').get(id).n; },
};
