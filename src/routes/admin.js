// Admin dashboard API. Everything under /api/admin requires a signed-in session.
const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const rateLimit = require('express-rate-limit');
const { settings, gallery, services, enquiries, users, safeJson } = require('../db');
const { CATEGORIES, ICONS, ENQUIRY_STATUSES } = require('../constants');
const { requireAdmin, login, logout } = require('../auth');
const bcrypt = require('bcryptjs');

const router = express.Router();
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || './public/uploads');
fs.mkdirSync(path.join(UPLOAD_DIR, 'gallery'), { recursive: true });
fs.mkdirSync(path.join(UPLOAD_DIR, 'site'), { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 20 },
  fileFilter: (req, file, cb) => cb(null, /^image\/(jpeg|png|webp|avif|tiff|heic|heif)$/.test(file.mimetype)),
});

const CAT_SLUGS = CATEGORIES.map(c => c.slug);
const clean = (v, max = 500) => String(v ?? '').trim().slice(0, max);

/* ---------------------------------------------------------------- */
/* Auth                                                              */
/* ---------------------------------------------------------------- */
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' } });

router.post('/api/admin/login', loginLimiter, login);
router.post('/api/admin/logout', logout);
router.get('/api/admin/me', (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ error: 'Not signed in' });
  res.json({ username: req.session.username });
});

// Everything below requires login
router.use('/api/admin', requireAdmin);

router.post('/api/admin/password', (req, res) => {
  const { current = '', next = '' } = req.body || {};
  const user = users.byUsername(req.session.username);
  if (!bcrypt.compareSync(String(current), user.password_hash)) return res.status(400).json({ error: 'Current password is wrong.' });
  if (String(next).length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  users.setPassword(user.id, String(next));
  res.json({ ok: true });
});

/* ---------------------------------------------------------------- */
/* Dashboard summary                                                 */
/* ---------------------------------------------------------------- */
router.get('/api/admin/summary', (req, res) => {
  res.json({
    enquiries: enquiries.counts(),
    gallery: gallery.all().length,
    services: services.all().length,
    recent: enquiries.all().slice(0, 5),
    meta: { categories: CATEGORIES, icons: ICONS, statuses: ENQUIRY_STATUSES },
  });
});

/* ---------------------------------------------------------------- */
/* Enquiries                                                         */
/* ---------------------------------------------------------------- */
router.get('/api/admin/enquiries', (req, res) => {
  const status = ENQUIRY_STATUSES.includes(req.query.status) ? req.query.status : undefined;
  res.json({ items: enquiries.all(status), counts: enquiries.counts() });
});
router.get('/api/admin/enquiries/:id', (req, res) => {
  const e = enquiries.get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Not found' });
  if (e.status === 'new') { enquiries.setStatus(e.id, 'read'); e.status = 'read'; }
  res.json(e);
});
router.patch('/api/admin/enquiries/:id', (req, res) => {
  const status = req.body?.status;
  if (!ENQUIRY_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  enquiries.setStatus(req.params.id, status);
  res.json({ ok: true });
});
router.delete('/api/admin/enquiries/:id', (req, res) => { enquiries.remove(req.params.id); res.json({ ok: true }); });

/* ---------------------------------------------------------------- */
/* Gallery                                                           */
/* ---------------------------------------------------------------- */
router.get('/api/admin/gallery', (req, res) => res.json({ items: gallery.all(), categories: CATEGORIES }));

// Upload one or more photos. Each is converted to WebP: a 2000px "full" and a 900px "thumb".
router.post('/api/admin/gallery', upload.array('photos', 20), async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: 'No images received (JPEG, PNG, WebP, AVIF or HEIC only, max 25 MB each).' });
  const category = CAT_SLUGS.includes(req.body.category) ? req.body.category : CAT_SLUGS[0];
  const created = [];
  for (const file of req.files) {
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const base = path.join(UPLOAD_DIR, 'gallery', stamp);
    const img = sharp(file.buffer, { failOn: 'none' }).rotate();
    const meta = await img.metadata();
    await img.clone().resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true }).webp({ quality: 84 }).toFile(`${base}-full.webp`);
    const thumbInfo = await img.clone().resize({ width: 900, height: 900, fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toFile(`${base}-thumb.webp`);
    const title = clean(req.body.title, 120) || path.parse(file.originalname).name.replace(/[-_]+/g, ' ');
    const id = gallery.create({
      title, alt: clean(req.body.alt, 300) || title, category,
      src_full: `/uploads/gallery/${stamp}-full.webp`, src_thumb: `/uploads/gallery/${stamp}-thumb.webp`,
      width: thumbInfo.width || meta.width || 800, height: thumbInfo.height || meta.height || 1000,
      external: 0, featured: 0,
    });
    created.push(gallery.get(id));
  }
  res.status(201).json({ ok: true, items: created });
});

router.patch('/api/admin/gallery/:id', (req, res) => {
  const g = gallery.get(req.params.id);
  if (!g) return res.status(404).json({ error: 'Not found' });
  const b = req.body || {};
  gallery.update(g.id, {
    title: clean(b.title ?? g.title, 120) || g.title,
    alt: clean(b.alt ?? g.alt, 300),
    category: CAT_SLUGS.includes(b.category) ? b.category : g.category,
    featured: b.featured === undefined ? g.featured : (b.featured ? 1 : 0),
  });
  res.json({ ok: true, item: gallery.get(g.id) });
});

router.put('/api/admin/gallery/order', (req, res) => {
  const ids = (req.body?.ids || []).map(Number).filter(Number.isInteger);
  gallery.reorder(ids);
  res.json({ ok: true });
});

router.delete('/api/admin/gallery/:id', (req, res) => {
  const g = gallery.get(req.params.id);
  if (!g) return res.status(404).json({ error: 'Not found' });
  if (!g.external) [g.src_full, g.src_thumb].forEach(p => fs.rm(path.join(UPLOAD_DIR, 'gallery', path.basename(p)), () => {}));
  gallery.remove(g.id);
  res.json({ ok: true });
});

/* ---------------------------------------------------------------- */
/* Services                                                          */
/* ---------------------------------------------------------------- */
function serviceFromBody(b, fallback = {}) {
  const includes = Array.isArray(b.includes) ? b.includes : String(b.includes || '').split('\n');
  return {
    name: clean(b.name ?? fallback.name, 120),
    icon: ICONS.includes(b.icon) ? b.icon : (fallback.icon || 'camera'),
    price: clean(b.price ?? fallback.price, 80),
    description: clean(b.description ?? fallback.description, 600),
    includes: includes.map(s => clean(s, 120)).filter(Boolean).slice(0, 10),
    cta: clean(b.cta ?? fallback.cta, 60) || 'Book now',
    active: b.active === undefined ? (fallback.active ?? 1) : (b.active ? 1 : 0),
  };
}
router.get('/api/admin/services', (req, res) => res.json({ items: services.all(), icons: ICONS }));
router.post('/api/admin/services', (req, res) => {
  const s = serviceFromBody(req.body || {});
  if (!s.name) return res.status(400).json({ error: 'Service name is required.' });
  const id = services.create(s);
  res.status(201).json({ ok: true, item: services.get(id) });
});
router.put('/api/admin/services/order', (req, res) => {
  services.reorder((req.body?.ids || []).map(Number).filter(Number.isInteger));
  res.json({ ok: true });
});
router.patch('/api/admin/services/:id', (req, res) => {
  const cur = services.get(req.params.id);
  if (!cur) return res.status(404).json({ error: 'Not found' });
  const s = serviceFromBody(req.body || {}, cur);
  if (!s.name) return res.status(400).json({ error: 'Service name is required.' });
  services.update(cur.id, s);
  res.json({ ok: true, item: services.get(cur.id) });
});
router.delete('/api/admin/services/:id', (req, res) => { services.remove(req.params.id); res.json({ ok: true }); });

/* ---------------------------------------------------------------- */
/* Settings                                                          */
/* ---------------------------------------------------------------- */
router.get('/api/admin/settings', (req, res) => res.json({ settings: settings.all(), icons: ICONS }));

router.put('/api/admin/settings', (req, res) => {
  const allowed = new Set(settings.keys());
  const patch = {};
  for (const [k, v] of Object.entries(req.body || {})) {
    if (!allowed.has(k)) continue;
    if (k === 'stats' || k === 'about_points') {
      const arr = Array.isArray(v) ? v : safeJson(v, null);
      if (!Array.isArray(arr)) continue;
      patch[k] = JSON.stringify(arr.slice(0, 6).map(x => k === 'stats'
        ? { icon: ICONS.includes(x.icon) ? x.icon : 'star', label: clean(x.label, 40), value: Number(x.value) || 0, suffix: clean(x.suffix, 4) }
        : { icon: ICONS.includes(x.icon) ? x.icon : 'star', title: clean(x.title, 60), text: clean(x.text, 300) }));
    } else {
      patch[k] = clean(v, 5000);
    }
  }
  settings.setMany(patch);
  res.json({ ok: true, settings: settings.all() });
});

// Hero / about image upload → /uploads/site/<key>.webp
router.post('/api/admin/settings/image/:key', upload.single('photo'), async (req, res) => {
  const key = req.params.key;
  if (!['hero_image', 'about_image'].includes(key)) return res.status(400).json({ error: 'Unknown image slot' });
  if (!req.file) return res.status(400).json({ error: 'No image received.' });
  const name = `${key}-${Date.now()}.webp`;
  await sharp(req.file.buffer, { failOn: 'none' }).rotate()
    .resize({ width: 1200, height: 1500, fit: 'cover', position: 'attention' })
    .webp({ quality: 84 }).toFile(path.join(UPLOAD_DIR, 'site', name));
  const old = settings.get(key);
  if (old.startsWith('/uploads/site/')) fs.rm(path.join(UPLOAD_DIR, 'site', path.basename(old)), () => {});
  settings.set(key, `/uploads/site/${name}`);
  res.json({ ok: true, url: `/uploads/site/${name}` });
});

module.exports = router;
