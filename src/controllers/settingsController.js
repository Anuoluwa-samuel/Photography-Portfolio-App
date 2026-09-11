const Settings = require('../models/Settings');
const { clean, safeJson } = require('../utils/text');
const { ICONS } = require('../constants');
const imageService = require('../services/imageService');

function get(req, res) { res.json({ settings: Settings.all(), icons: ICONS }); }

function update(req, res) {
  const allowed = new Set(Settings.keys());
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
  Settings.setMany(patch);
  res.json({ ok: true, settings: Settings.all() });
}

async function uploadImage(req, res) {
  const key = req.params.key;
  if (!['hero_image', 'about_image'].includes(key)) return res.status(400).json({ success: false, message: 'Unknown image slot', error: 'VALIDATION_ERROR' });
  if (!req.file) return res.status(400).json({ success: false, message: 'No image received.', error: 'VALIDATION_ERROR' });
  const url = await imageService.processSiteImage(req.file.buffer, key);
  const old = Settings.get(key);
  if (old.startsWith('/uploads/site/')) imageService.removeSiteFile(old);
  Settings.set(key, url);
  res.json({ ok: true, url });
}

module.exports = { get, update, uploadImage };
