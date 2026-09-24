const Category = require('../models/Category');
const { clean } = require('../utils/text');
const { uniqueSlug, slugify } = require('../utils/slugify');

async function list(req, res) { res.json({ items: await Category.all() }); }

async function create(req, res) {
  const label = clean(req.body?.label, 60);
  if (!label) return res.status(400).json({ success: false, message: 'Category name is required.', error: 'VALIDATION_ERROR' });
  const slug = await uniqueSlug(label, async s => !!(await Category.bySlug(s)));
  const id = await Category.create({ slug, label, active: req.body?.active === undefined ? 1 : (req.body.active ? 1 : 0) });
  res.status(201).json({ ok: true, item: await Category.get(id) });
}

async function update(req, res) {
  const cur = await Category.get(req.params.id);
  if (!cur) return res.status(404).json({ success: false, message: 'Category not found', error: 'CATEGORY_NOT_FOUND' });
  const b = req.body || {};
  const label = clean(b.label, 60) || cur.label;
  const slug = b.slug !== undefined && clean(b.slug, 80) ? slugify(b.slug) : cur.slug;
  await Category.update(cur.id, { label, slug, active: b.active === undefined ? cur.active : (b.active ? 1 : 0) });
  res.json({ ok: true, item: await Category.get(cur.id) });
}

async function remove(req, res) {
  const cur = await Category.get(req.params.id);
  if (!cur) return res.status(404).json({ success: false, message: 'Category not found', error: 'CATEGORY_NOT_FOUND' });
  const inUse = await Category.inUseCount(cur.id);
  await Category.remove(cur.id); // projects referencing it fall back to "uncategorized" (category_id = NULL)
  res.json({ ok: true, unassignedProjects: inUse });
}

async function reorder(req, res) {
  await Category.reorder((req.body?.ids || []).map(Number).filter(Number.isInteger));
  res.json({ ok: true });
}

module.exports = { list, create, update, remove, reorder };
