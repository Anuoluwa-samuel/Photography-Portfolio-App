// Shared text helpers used by controllers and views.

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** "Light that [[remembers]] the moment" -> escaped HTML with <em> around the accent word(s). */
const accent = str => esc(str).replace(/\[\[(.+?)\]\]/g, '<em>$1</em>');

/** Multi-paragraph text -> array of paragraphs. */
const paragraphs = str => String(str || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

/** Trim + cap length; used to sanitize incoming admin/API text fields. */
const clean = (v, max = 500) => String(v ?? '').trim().slice(0, max);

const safeJson = (str, fallback) => { try { return JSON.parse(str); } catch { return fallback; } };

module.exports = { esc, accent, paragraphs, clean, safeJson };
