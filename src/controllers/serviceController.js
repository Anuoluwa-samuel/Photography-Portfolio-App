const Service = require('../models/Service');
const { clean } = require('../utils/text');
const { ICONS } = require('../constants');

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

function list(req, res) { res.json({ items: Service.all(), icons: ICONS }); }

function create(req, res) {
  const s = serviceFromBody(req.body || {});
  if (!s.name) return res.status(400).json({ success: false, message: 'Service name is required.', error: 'VALIDATION_ERROR' });
  const id = Service.create(s);
  res.status(201).json({ ok: true, item: Service.get(id) });
}

function update(req, res) {
  const cur = Service.get(req.params.id);
  if (!cur) return res.status(404).json({ success: false, message: 'Service not found', error: 'SERVICE_NOT_FOUND' });
  const s = serviceFromBody(req.body || {}, cur);
  if (!s.name) return res.status(400).json({ success: false, message: 'Service name is required.', error: 'VALIDATION_ERROR' });
  Service.update(cur.id, s);
  res.json({ ok: true, item: Service.get(cur.id) });
}

function remove(req, res) { Service.remove(req.params.id); res.json({ ok: true }); }

function reorder(req, res) {
  Service.reorder((req.body?.ids || []).map(Number).filter(Number.isInteger));
  res.json({ ok: true });
}

module.exports = { list, create, update, remove, reorder };
