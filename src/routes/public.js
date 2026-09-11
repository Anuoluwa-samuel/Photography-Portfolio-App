// Public site: server-rendered homepage + enquiry endpoint.
const express = require('express');
const rateLimit = require('express-rate-limit');
const { settings, gallery, services, enquiries, safeJson } = require('../db');
const { CATEGORIES, SOCIALS } = require('../constants');
const { sendEnquiryNotification } = require('../mailer');

const router = express.Router();

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/** "Light that [[remembers]] the moment" → escaped HTML with <em> around the accent word(s). */
const accent = str => esc(str).replace(/\[\[(.+?)\]\]/g, '<em>$1</em>');
/** Multi-paragraph text → array of paragraphs */
const paragraphs = str => String(str || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

/* ---------- Homepage ---------- */
router.get('/', (req, res) => {
  const s = settings.all();
  const socials = SOCIALS.map(k => ({ key: k, url: s['social_' + k] })).filter(x => x.url);
  res.render('index', {
    s, esc, accent, paragraphs,
    siteUrl: process.env.SITE_URL || `${req.protocol}://${req.get('host')}`,
    categories: CATEGORIES,
    catLabel: Object.fromEntries(CATEGORIES.map(c => [c.slug, c.label])),
    socials,
    gallery: gallery.all(),
    featured: gallery.featured(),
    services: services.all(true),
    aboutPoints: safeJson(s.about_points, []),
    stats: safeJson(s.stats, []),
    year: new Date().getFullYear(),
  });
});

/* ---------- Enquiries ---------- */
const enquiryLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 6, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many enquiries from this connection. Please try again in a few minutes.' } });

router.post('/api/enquiries', enquiryLimiter, async (req, res) => {
  const b = req.body || {};
  if (b.company) return res.json({ ok: true }); // honeypot: pretend success

  const errors = {};
  const name = String(b.name || '').trim();
  const email = String(b.email || '').trim();
  const phone = String(b.phone || '').trim();
  const service = String(b.service || '').trim();
  const date = String(b.date || '').trim();
  const message = String(b.message || '').trim();

  if (name.length < 2 || name.length > 120) errors.name = 'Enter your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) errors.email = 'Enter a valid email address.';
  if (phone && !/^[+\d][\d\s()-]{6,30}$/.test(phone)) errors.phone = 'Enter a valid phone number, or leave it blank.';
  if (!service) errors.service = 'Choose the type of photography.';
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(date) < new Date(new Date().toDateString()))) errors.date = "Choose a date that hasn't passed.";
  if (message.length < 10 || message.length > 5000) errors.message = 'Add a little detail so I can send an accurate quote.';
  if (Object.keys(errors).length) return res.status(422).json({ error: 'Please fix the highlighted fields.', fields: errors });

  const record = { name, email, phone, service, preferred_date: date, message, ip: req.ip || '' };
  const id = enquiries.create(record);
  sendEnquiryNotification(record, settings.get('site_name')).catch(err => console.error('[mail] failed:', err.message));
  res.status(201).json({ ok: true, id });
});

/* ---------- Read-only JSON (handy for a future app or headless use) ---------- */
router.get('/api/gallery', (req, res) => res.json(gallery.all().map(publicGalleryItem)));
router.get('/api/services', (req, res) => res.json(services.all(true)));

function publicGalleryItem(g) {
  return { id: g.id, title: g.title, alt: g.alt, category: g.category, src: g.src_full, thumb: g.src_thumb, width: g.width, height: g.height, featured: !!g.featured };
}

module.exports = router;
