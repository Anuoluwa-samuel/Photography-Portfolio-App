const Project = require('../models/Project');
const Image = require('../models/Image');
const Category = require('../models/Category');
const { clean } = require('../utils/text');
const { uniqueSlug, slugify } = require('../utils/slugify');
const imageService = require('../services/imageService');

/** Builds the non-slug, non-title project fields shared by create and update. Missing keys in `b`
 *  fall back to `fallback` (the current row on update) rather than being blanked out — so a partial
 *  PATCH like { published: false } doesn't wipe the description, location, etc. */
async function projectFromBody(b, fallback = {}) {
  const categoryId = b.category_id !== undefined ? (Number(b.category_id) || null) : fallback.category_id ?? null;
  const category = categoryId ? await Category.get(categoryId) : null;
  return {
    description: b.description !== undefined ? clean(b.description, 3000) : (fallback.description || ''),
    category_id: category ? category.id : null,
    location: b.location !== undefined ? clean(b.location, 160) : (fallback.location || ''),
    date: b.date !== undefined ? (/^\d{4}-\d{2}-\d{2}$/.test(String(b.date || '')) ? b.date : '') : (fallback.date || ''),
    featured: b.featured !== undefined ? (b.featured ? 1 : 0) : (fallback.featured ?? 0),
    published: b.published !== undefined ? (b.published ? 1 : 0) : (fallback.published ?? 1),
  };
}

async function list(req, res) {
  const [items, categories] = await Promise.all([Project.all(), Category.all()]);
  res.json({ items, categories });
}

async function get(req, res) {
  const p = await Project.get(req.params.id);
  if (!p) return res.status(404).json({ success: false, message: 'Project not found', error: 'PROJECT_NOT_FOUND' });
  res.json({ item: p, images: await Image.forProject(p.id) });
}

async function create(req, res) {
  const b = req.body || {};
  const title = clean(b.title, 120);
  if (!title) return res.status(400).json({ success: false, message: 'Project title is required.', error: 'VALIDATION_ERROR' });
  const slug = await uniqueSlug(clean(b.slug, 80) || title, s => Project.slugExists(s));
  const data = { ...(await projectFromBody(b)), title, slug };
  const id = await Project.create(data);
  res.status(201).json({ ok: true, item: await Project.get(id) });
}

async function update(req, res) {
  const cur = await Project.get(req.params.id);
  if (!cur) return res.status(404).json({ success: false, message: 'Project not found', error: 'PROJECT_NOT_FOUND' });
  const b = req.body || {};
  const title = clean(b.title, 120) || cur.title;
  let slug = cur.slug;
  if (b.slug !== undefined) {
    const requested = clean(b.slug, 80) ? slugify(b.slug) : slugify(title);
    slug = requested === cur.slug ? cur.slug : await uniqueSlug(requested, s => Project.slugExists(s));
  }
  const data = { ...(await projectFromBody(b, cur)), title, slug, id: cur.id };
  await Project.update(cur.id, data);
  res.json({ ok: true, item: await Project.get(cur.id) });
}

async function remove(req, res) {
  const p = await Project.get(req.params.id);
  if (!p) return res.status(404).json({ success: false, message: 'Project not found', error: 'PROJECT_NOT_FOUND' });
  for (const img of await Image.forProject(p.id)) {
    await imageService.removeGalleryFile(img.src_full);
    await imageService.removeGalleryFile(img.src_thumb);
  }
  await Project.remove(p.id); // ON DELETE CASCADE removes the image rows
  res.json({ ok: true });
}

async function reorder(req, res) {
  const ids = (req.body?.ids || []).map(Number).filter(Number.isInteger);
  await Project.reorder(ids);
  res.json({ ok: true });
}

/* ---------------------------------------------------------------- */
/* Images within a project                                          */
/* ---------------------------------------------------------------- */
async function uploadImages(req, res) {
  const project = await Project.get(req.params.id);
  if (!project) return res.status(404).json({ success: false, message: 'Project not found', error: 'PROJECT_NOT_FOUND' });
  if (!req.files?.length) return res.status(400).json({ success: false, message: 'No images received (JPEG, PNG, WebP, AVIF or HEIC only, max 25 MB each).', error: 'VALIDATION_ERROR' });

  const created = [];
  for (const file of req.files) {
    const processed = await imageService.processProjectImage(file.buffer);
    const id = await Image.create({ project_id: project.id, ...processed, caption: clean(req.body.caption, 120), alt: clean(req.body.alt, 300) });
    created.push(await Image.get(id));
  }
  if (!project.cover_image) await Project.setCover(project.id, created[0].src_thumb);
  res.status(201).json({ ok: true, items: created, project: await Project.get(project.id) });
}

async function updateImage(req, res) {
  const img = await Image.get(req.params.imageId);
  if (!img || img.project_id !== Number(req.params.id)) return res.status(404).json({ success: false, message: 'Image not found', error: 'IMAGE_NOT_FOUND' });
  const b = req.body || {};
  await Image.update(img.id, { caption: clean(b.caption ?? img.caption, 120), alt: clean(b.alt ?? img.alt, 300) });
  if (b.cover) await Project.setCover(img.project_id, img.src_thumb);
  const [item, project] = await Promise.all([Image.get(img.id), Project.get(img.project_id)]);
  res.json({ ok: true, item, project });
}

async function removeImage(req, res) {
  const img = await Image.get(req.params.imageId);
  if (!img || img.project_id !== Number(req.params.id)) return res.status(404).json({ success: false, message: 'Image not found', error: 'IMAGE_NOT_FOUND' });
  await imageService.removeGalleryFile(img.src_full);
  await imageService.removeGalleryFile(img.src_thumb);
  await Image.remove(img.id);
  const project = await Project.get(img.project_id);
  if (project.cover_image === img.src_thumb) {
    const next = (await Image.forProject(project.id))[0];
    await Project.setCover(project.id, next ? next.src_thumb : '');
  }
  res.json({ ok: true, project: await Project.get(img.project_id) });
}

async function reorderImages(req, res) {
  const ids = (req.body?.ids || []).map(Number).filter(Number.isInteger);
  await Image.reorder(Number(req.params.id), ids);
  res.json({ ok: true });
}

module.exports = { list, get, create, update, remove, reorder, uploadImages, updateImage, removeImage, reorderImages };
