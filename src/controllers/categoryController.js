const Category = require('../models/Category');
const { clean } = require('../utils/text');
const { uniqueSlug, slugify } = require('../utils/slugify');

function list(req, res) { res.json({ items: Category.all() }); }

function create(req, res) {
  const label = clean(req.body?.label, 60);
  if (!label) return res.status(400).json({ success: false, message: 'Category name is required.', error: 'VALIDATION_ERROR' });
  const slug = uniqueSlug(label, s => !!Category.bySlug(s));
  const id = Category.create({ slug, label, active: req.body?.active === undefined ? 1 : (req.body.active ? 1 : 0) });
  res.status(201).json({ ok: true, item: Category.get(id) });
}

function update(req, res) {
  const cur = Category.get(req.params.id);
  if (!cur) return res.status(404).json({ success: false, message: 'Category not found', error: 'CATEGORY_NOT_FOUND' });
  const b = req.body || {};
  const label = clean(b.label, 60) || cur.label;
  const slug = b.slug !== undefined && clean(b.slug, 80) ? slugify(b.slug) : cur.slug;
  Category.update(cur.id, { label, slug, active: b.active === undefined ? cur.active : (b.active ? 1 : 0) });
  res.json({ ok: true, item: Category.get(cur.id) });
}

function remove(req, res) {
  const cur = Category.get(req.params.id);
  if (!cur) return res.status(404).json({ success: false, message: 'Category not found', error: 'CATEGORY_NOT_FOUND' });
  const inUse = Category.inUseCount(cur.id);
  Category.remove(cur.id); // projects referencing it fall back to "uncategorized" (category_id = NULL)
  res.json({ ok: true, unassignedProjects: inUse });
}

function reorder(req, res) {
  Category.reorder((req.body?.ids || []).map(Number).filter(Number.isInteger));
  res.json({ ok: true });
}

module.exports = { list, create, update, remove, reorder };
