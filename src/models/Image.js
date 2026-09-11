const { db } = require('../config/database');

module.exports = {
  forProject(projectId) { return db.prepare('SELECT * FROM images WHERE project_id = ? ORDER BY sort, id').all(projectId); },
  get(id) { return db.prepare('SELECT * FROM images WHERE id = ?').get(id); },
  count() { return db.prepare('SELECT COUNT(*) AS n FROM images').get().n; },
  create(img) {
    const sort = (db.prepare('SELECT COALESCE(MAX(sort), -1) AS m FROM images WHERE project_id = ?').get(img.project_id).m) + 1;
    return db.prepare(`INSERT INTO images (project_id, src_full, src_thumb, width, height, caption, alt, sort)
                       VALUES (@project_id, @src_full, @src_thumb, @width, @height, @caption, @alt, @sort)`)
             .run({ caption: '', alt: '', ...img, sort }).lastInsertRowid;
  },
  update(id, img) {
    return db.prepare('UPDATE images SET caption = @caption, alt = @alt WHERE id = @id').run({ ...img, id });
  },
  reorder(projectId, ids) {
    const up = db.prepare('UPDATE images SET sort = ? WHERE id = ? AND project_id = ?');
    db.transaction(() => ids.forEach((id, i) => up.run(i, id, projectId)))();
  },
  remove(id) { return db.prepare('DELETE FROM images WHERE id = ?').run(id); },
};
