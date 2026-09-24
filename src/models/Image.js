const { db } = require('../config/database');

module.exports = {
  async forProject(projectId) { return db.prepare('SELECT * FROM images WHERE project_id = ? ORDER BY sort, id').all(projectId); },
  async get(id) { return db.prepare('SELECT * FROM images WHERE id = ?').get(id); },
  async count() {
    const { n } = await db.prepare('SELECT COUNT(*) AS n FROM images').get();
    return n;
  },
  async create(img) {
    const { m } = await db.prepare('SELECT COALESCE(MAX(sort), -1) AS m FROM images WHERE project_id = ?').get(img.project_id);
    const res = await db.prepare(`INSERT INTO images (project_id, src_full, src_thumb, width, height, caption, alt, sort)
                                  VALUES (@project_id, @src_full, @src_thumb, @width, @height, @caption, @alt, @sort)`)
                        .run({ caption: '', alt: '', ...img, sort: m + 1 });
    return res.lastInsertRowid;
  },
  async update(id, img) {
    return db.prepare('UPDATE images SET caption = @caption, alt = @alt WHERE id = @id').run({ ...img, id });
  },
  async reorder(projectId, ids) {
    await db.batch(ids.map((id, i) => ({ sql: 'UPDATE images SET sort = ? WHERE id = ? AND project_id = ?', args: [i, id, projectId] })));
  },
  async remove(id) { return db.prepare('DELETE FROM images WHERE id = ?').run(id); },
};
