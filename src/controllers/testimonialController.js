const Testimonial = require('../models/Testimonial');
const { clean } = require('../utils/text');
const imageService = require('../services/imageService');

function testimonialFromBody(b, fallback = {}) {
  return {
    quote: clean(b.quote ?? fallback.quote, 800),
    name: clean(b.name ?? fallback.name, 120),
    meta: clean(b.meta ?? fallback.meta, 120),
    active: b.active === undefined ? (fallback.active ?? 1) : (b.active ? 1 : 0),
  };
}

const notFound = res => res.status(404).json({ success: false, message: 'Testimonial not found', error: 'TESTIMONIAL_NOT_FOUND' });
const noQuote = res => res.status(400).json({ success: false, message: 'The quote is required.', error: 'VALIDATION_ERROR' });

async function list(req, res) { res.json({ items: await Testimonial.all() }); }

async function create(req, res) {
  const t = testimonialFromBody(req.body || {});
  if (!t.quote) return noQuote(res);
  const id = await Testimonial.create(t);
  res.status(201).json({ ok: true, item: await Testimonial.get(id) });
}

async function update(req, res) {
  const cur = await Testimonial.get(req.params.id);
  if (!cur) return notFound(res);
  const t = testimonialFromBody(req.body || {}, cur);
  if (!t.quote) return noQuote(res);
  await Testimonial.update(cur.id, t);
  res.json({ ok: true, item: await Testimonial.get(cur.id) });
}

async function remove(req, res) {
  const cur = await Testimonial.get(req.params.id);
  if (!cur) return notFound(res);
  await Testimonial.remove(cur.id);
  await imageService.removeSiteFile(cur.photo);
  res.json({ ok: true });
}

async function reorder(req, res) {
  await Testimonial.reorder((req.body?.ids || []).map(Number).filter(Number.isInteger));
  res.json({ ok: true });
}

async function uploadPhoto(req, res) {
  const cur = await Testimonial.get(req.params.id);
  if (!cur) return notFound(res);
  if (!req.file) return res.status(400).json({ success: false, message: 'No image received.', error: 'VALIDATION_ERROR' });
  const url = await imageService.processSiteImage(req.file.buffer, `testimonial-${cur.id}`);
  await Testimonial.setPhoto(cur.id, url);
  await imageService.removeSiteFile(cur.photo);
  res.json({ ok: true, url });
}

async function removePhoto(req, res) {
  const cur = await Testimonial.get(req.params.id);
  if (!cur) return notFound(res);
  await Testimonial.setPhoto(cur.id, '');
  await imageService.removeSiteFile(cur.photo);
  res.json({ ok: true });
}

module.exports = { list, create, update, remove, reorder, uploadPhoto, removePhoto };
