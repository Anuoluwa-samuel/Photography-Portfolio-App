const { db } = require('../config/database');

const BASE_SELECT = `
  SELECT p.*, c.slug AS category_slug, c.label AS category_label,
         (SELECT COUNT(*) FROM images WHERE images.project_id = p.id) AS image_count
  FROM projects p
  LEFT JOIN categories c ON c.id = p.category_id
`;

module.exports = {
  async all({ publishedOnly = false } = {}) {
    return db.prepare(`${BASE_SELECT} ${publishedOnly ? 'WHERE p.published = 1' : ''} ORDER BY p.sort, p.id`).all();
  },
  async featured(limit = 3) {
    return db.prepare(`${BASE_SELECT} WHERE p.published = 1 AND p.featured = 1 ORDER BY p.sort, p.id LIMIT ?`).all(limit);
  },
  async recent(limit = 5) {
    return db.prepare(`${BASE_SELECT} ORDER BY p.created_at DESC LIMIT ?`).all(limit);
  },
  async get(id)      { return db.prepare(`${BASE_SELECT} WHERE p.id = ?`).get(id); },
  async bySlug(slug) { return db.prepare(`${BASE_SELECT} WHERE p.slug = ?`).get(slug); },
  async slugExists(slug) { return !!(await db.prepare('SELECT 1 FROM projects WHERE slug = ?').get(slug)); },
  async count() {
    const { n } = await db.prepare('SELECT COUNT(*) AS n FROM projects').get();
    return n;
  },

  async create(p) {
    const { m } = await db.prepare('SELECT COALESCE(MAX(sort), -1) AS m FROM projects').get();
    const res = await db.prepare(`INSERT INTO projects (title, slug, description, category_id, location, date, cover_image, featured, published, sort)
                                  VALUES (@title, @slug, @description, @category_id, @location, @date, @cover_image, @featured, @published, @sort)`)
                        .run({ description: '', category_id: null, location: '', date: '', cover_image: '', featured: 0, published: 1, ...p, sort: m + 1 });
    return res.lastInsertRowid;
  },
  async update(id, p) {
    return db.prepare(`UPDATE projects SET title = @title, slug = @slug, description = @description, category_id = @category_id,
                       location = @location, date = @date, featured = @featured, published = @published, updated_at = datetime('now') WHERE id = @id`)
             .run({ ...p, id });
  },
  async setCover(id, coverImage) {
    return db.prepare(`UPDATE projects SET cover_image = ?, updated_at = datetime('now') WHERE id = ?`).run(coverImage, id);
  },
  async reorder(ids) {
    await db.batch(ids.map((id, i) => ({ sql: 'UPDATE projects SET sort = ? WHERE id = ?', args: [i, id] })));
  },
  async remove(id) { return db.prepare('DELETE FROM projects WHERE id = ?').run(id); },
};
