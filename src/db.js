// Database: schema, first-run seed, and small query helpers.
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'site.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/* ------------------------------------------------------------------ */
/* Schema                                                              */
/* ------------------------------------------------------------------ */
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS gallery (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  alt TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  src_full TEXT NOT NULL,
  src_thumb TEXT NOT NULL,
  width INTEGER NOT NULL DEFAULT 800,
  height INTEGER NOT NULL DEFAULT 1000,
  external INTEGER NOT NULL DEFAULT 0,
  featured INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'camera',
  price TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  includes TEXT NOT NULL DEFAULT '[]',
  cta TEXT NOT NULL DEFAULT 'Book now',
  active INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS enquiries (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  service TEXT NOT NULL DEFAULT '',
  preferred_date TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  ip TEXT NOT NULL DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);
`);

/* ------------------------------------------------------------------ */
/* Seed (runs once, on an empty database)                              */
/* ------------------------------------------------------------------ */
const U  = (id, w, h) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=75`;
const UL = (id)       => `https://images.unsplash.com/photo-${id}?auto=format&fit=max&w=2000&q=85`;

const DEFAULT_SETTINGS = {
  // Brand
  brand_name: 'Adeyemi',
  brand_tagline: 'visual storyteller',
  site_name: 'Adeyemi Visuals',
  photographer_name: 'Samuel Adeyemi',
  // SEO
  seo_title: 'Adeyemi Visuals | Portrait & Wedding Photographer in Lagos, Nigeria',
  seo_description: 'Adeyemi Visuals is a Lagos-based portrait, wedding and editorial photographer creating cinematic, timeless imagery. View the portfolio, explore services and book a session.',
  seo_keywords: 'Lagos photographer, wedding photographer Nigeria, portrait photography Lagos, editorial photographer',
  // Hero  (wrap the accent word in [[double brackets]])
  hero_eyebrow: 'Portrait · Wedding · Editorial',
  hero_title: 'Light that [[remembers]] the moment',
  hero_intro: 'Lagos-based photographer shooting portraits, weddings and editorial stories with a cinematic eye. Quiet light, honest expression, images built to outlast the trend they were made in.',
  hero_image: U('1494790108377-be9c29b29330', 900, 1125),
  hero_image_alt: 'Studio portrait of a woman lit from one side against a dark background',
  hero_tag: 'Selected work',
  hero_tag_sub: 'Studio portraits, 2026',
  // Featured
  featured_title: 'Three frames [[I\'d]] start with',
  featured_intro: 'A quick look before the full gallery: one portrait, one wedding, one editorial. Each was made with available light and a lot of patience.',
  // About
  about_title: 'Who is [[behind]] the lens',
  about_bio: "I'm Samuel Adeyemi, a photographer working out of Lagos for the past nine years. I started with a borrowed film camera at university events and never quite put it down.\n\nToday I split my time between studio portraiture, weddings across Nigeria and editorial work for fashion and lifestyle brands. My approach is simple: slow down, find the light, and let people be themselves in front of it.",
  about_quote: "I'm not chasing perfect. I'm chasing the second before someone remembers the camera is there.",
  about_image: U('1507003211169-0a1dd7228f2d', 800, 1000),
  about_image_alt: 'Portrait of photographer Samuel Adeyemi holding a camera',
  about_points: JSON.stringify([
    { icon: 'sun',   title: 'Natural light first', text: 'Flash only when the story needs it. Most of the work here is sun, shade and a reflector.' },
    { icon: 'eye',   title: 'Documentary eye',     text: 'Minimal posing. I direct just enough, then step back and wait for the real thing.' },
    { icon: 'frame', title: 'Editorial finish',    text: 'Clean, film-leaning colour. Retouching that respects skin and keeps the image honest.' },
    { icon: 'clock', title: 'Delivered on time',   text: 'Previews within 48 hours, full galleries in three weeks, every time.' },
  ]),
  stats: JSON.stringify([
    { icon: 'camera', label: 'Projects', value: 420, suffix: '+' },
    { icon: 'heart',  label: 'Weddings', value: 140, suffix: '+' },
    { icon: 'users',  label: 'Clients',  value: 900, suffix: '+' },
    { icon: 'star',   label: 'Years',    value: 9,   suffix: '' },
  ]),
  // Portfolio / services / contact copy
  portfolio_title: 'Selected [[work]]',
  portfolio_intro: 'Browse by category or take it all in. Tap any image to view it full-screen.',
  services_title: 'What I [[shoot]]',
  services_intro: "Every package includes a planning call, professional editing and a private online gallery. Prices are starting points; tell me about your day and I'll send a proper quote.",
  testimonial_text: "He disappeared into our wedding. We barely noticed him, and then the photos came back and he'd seen everything.",
  testimonial_name: 'Tolu & Damilare',
  testimonial_meta: 'Wedding, Abuja',
  contact_title: "Let's make [[something]]",
  contact_intro: 'Tell me about your session, wedding or campaign. I reply to every enquiry within one working day, and dates go quickly between November and February.',
  // Contact details
  email: 'hello@adeyemivisuals.com',
  phone: '+234 800 000 0000',
  location: 'Lagos, Nigeria — available across Nigeria and for destination weddings',
  location_short: 'Lagos, Nigeria',
  hours: 'Mon–Sat, 9am–6pm WAT',
  footer_blurb: 'Portrait, wedding and editorial photography with a cinematic eye. Based in Lagos, working everywhere the light is good.',
  // Socials (leave blank to hide)
  social_instagram: 'https://instagram.com/adeyemivisuals',
  social_facebook: 'https://facebook.com/adeyemivisuals',
  social_tiktok: 'https://tiktok.com/@adeyemivisuals',
  social_x: 'https://x.com/adeyemivisuals',
  social_linkedin: 'https://linkedin.com/in/adeyemivisuals',
  social_youtube: 'https://youtube.com/@adeyemivisuals',
};

const SEED_GALLERY = [
  ['portraits',  'Window light, Yaba',       'Close-up portrait of a man in soft window light',                     '1500648767791-00dcc994a43e', 800, 1000, 1],
  ['portraits',  'Studio, one lamp',         'Studio portrait of a woman lit from one side',                         '1494790108377-be9c29b29330', 800, 1000, 0],
  ['portraits',  'Afternoon, Ikoyi',         'Portrait of a man in a linen shirt smiling in warm light',             '1507003211169-0a1dd7228f2d', 800, 960,  0],
  ['portraits',  'Golden hour headshot',     'Woman with curly hair photographed at golden hour',                    '1531746020798-e6953c6e8e04', 800, 1100, 0],
  ['weddings',   'Tolu & Damilare',          'Bride and groom walking together at golden hour',                       '1519741497674-611481863552', 800, 1000, 1],
  ['weddings',   'The first look',           'Groom seeing the bride for the first time in a garden',                '1511285560929-80b456fea0bc', 800, 1066, 0],
  ['weddings',   'Vows, Abuja',              'Couple exchanging vows outdoors surrounded by greenery',               '1465495976277-4387d4b0b4c6', 800, 1000, 0],
  ['events',     'Main stage, Eko Hotel',    'Concert crowd with hands raised under stage lights',                    '1492684223066-81342ee5ff30', 800, 600,  0],
  ['events',     'Tech summit keynote',      'Speaker on stage at a conference in front of a large audience',        '1540575467063-178a50c2df87', 800, 600,  0],
  ['events',     'Launch night',             'Guests mingling at an evening product launch',                         '1511578314322-379afb476865', 800, 1000, 0],
  ['fashion',    'Street editorial, Lekki',  'Fashion editorial of a model in a long coat on a city street',         '1483985988355-763728e1935b', 800, 920,  1],
  ['fashion',    'Lookbook SS26',            'Model in a patterned outfit posing against a plain wall',              '1469334031218-e382a71b716b', 800, 1100, 0],
  ['fashion',    'Rooftop campaign',         'Model in an oversized jacket photographed on a rooftop',               '1515886657613-9f3515b0c78f', 800, 1000, 0],
  ['lifestyle',  'Sunday brunch',            'Overhead shot of a table set with colourful dishes',                   '1504674900247-0877df9cc836', 800, 600,  0],
  ['lifestyle',  'Morning, Victoria Island', 'Woman laughing in a sunlit apartment',                                 '1529626455594-4ff0802cfb7e', 800, 1000, 0],
  ['lifestyle',  'Between sets',             'Man relaxing outdoors in soft afternoon light',                        '1506794778202-cad84cf45f1d', 800, 1000, 0],
  ['commercial', 'Timepiece campaign',       'Product photograph of a wristwatch on a dark surface',                 '1523275335684-37898b6baf30', 800, 800,  0],
  ['commercial', 'Sneaker drop',             'Red sneaker floating against a plain background',                      '1542291026-7eec264c27ff',    800, 640,  0],
  ['nature',     'Ridge line at dawn',       'Mountain ridge above a sea of clouds at sunrise',                      '1506905925346-21bda4d32df4', 800, 560,  0],
  ['nature',     'Forest road',              'Road winding through a foggy forest',                                  '1470071459604-3b5ec3a7fe05', 800, 560,  0],
  ['nature',     'Obudu, early morning',     'Traveller looking over a valley at sunrise',                           '1501594907352-04cda38ebc29', 800, 1000, 0],
];

const SEED_SERVICES = [
  ['Portrait photography',  'camera',   'From ₦120,000',        'Studio or location sessions for individuals, couples and families. Relaxed direction, real expressions.',           ['90-minute session', '2 outfit changes', '25 edited images', 'Online gallery + print rights'], 'Book portraits'],
  ['Wedding photography',   'ring',     'From ₦650,000',        'Full-day coverage from getting ready to the last dance, for traditional and white weddings across Nigeria.',    ['10 hours, one photographer', 'Engagement session', '500+ edited images', 'Same-week sneak peeks'], 'Book a wedding'],
  ['Event photography',     'calendar', 'From ₦180,000',        'Launches, conferences, concerts and private celebrations, documented with an editorial eye.',                  ['Half-day or full-day', 'Candid + formal coverage', '150+ edited images', '48-hour highlights'], 'Book an event'],
  ['Fashion & editorial',   'hanger',   'From ₦250,000',        'Lookbooks, campaigns and magazine-style editorials for designers, stylists and brands.',                       ['Creative direction call', 'Half-day shoot', '40 retouched images', 'Web + print licensing'], 'Book an editorial'],
  ['Product & commercial',  'box',      'From ₦150,000',        'Clean product shots and lifestyle imagery for e-commerce, packaging and advertising.',                          ['Up to 15 products', 'White + styled setups', '3 angles per product', 'Commercial licence'], 'Book product shots'],
  ['Editing & retouching',  'wand',     'From ₦5,000 / image',  "Colour grading and high-end retouching for images you've already shot. Natural results, no plastic skin.",     ['Colour + exposure correction', 'Skin and background cleanup', '2 revision rounds', '72-hour turnaround'], 'Send your files'],
];

function seedIfEmpty() {
  const settingsCount = db.prepare('SELECT COUNT(*) AS n FROM settings').get().n;
  if (settingsCount === 0) {
    const ins = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    db.transaction(() => { for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) ins.run(k, v); })();
  }
  if (db.prepare('SELECT COUNT(*) AS n FROM gallery').get().n === 0) {
    const ins = db.prepare(`INSERT INTO gallery (title, alt, category, src_full, src_thumb, width, height, external, featured, sort)
                            VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`);
    db.transaction(() => {
      SEED_GALLERY.forEach(([cat, title, alt, img, w, h, feat], i) => ins.run(title, alt, cat, UL(img), U(img, w, h), w, h, feat, i));
    })();
  }
  if (db.prepare('SELECT COUNT(*) AS n FROM services').get().n === 0) {
    const ins = db.prepare('INSERT INTO services (name, icon, price, description, includes, cta, sort) VALUES (?, ?, ?, ?, ?, ?, ?)');
    db.transaction(() => {
      SEED_SERVICES.forEach(([name, icon, price, desc, inc, cta], i) => ins.run(name, icon, price, desc, JSON.stringify(inc), cta, i));
    })();
  }
  if (db.prepare('SELECT COUNT(*) AS n FROM users').get().n === 0) {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, bcrypt.hashSync(password, 12));
    console.log(`[db] Created admin user "${username}" (password from ADMIN_PASSWORD in .env)`);
  }
}
seedIfEmpty();

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const settings = {
  all() {
    const out = {};
    for (const r of db.prepare('SELECT key, value FROM settings').all()) out[r.key] = r.value;
    return out;
  },
  get(key) { return db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value ?? ''; },
  set(key, value) { db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, String(value ?? '')); },
  setMany(obj) { db.transaction(() => { for (const [k, v] of Object.entries(obj)) settings.set(k, v); })(); },
  keys() { return Object.keys(DEFAULT_SETTINGS); },
};

const gallery = {
  all()      { return db.prepare('SELECT * FROM gallery ORDER BY sort, id').all(); },
  featured() { return db.prepare('SELECT * FROM gallery WHERE featured = 1 ORDER BY sort, id LIMIT 3').all(); },
  get(id)    { return db.prepare('SELECT * FROM gallery WHERE id = ?').get(id); },
  create(g) {
    const sort = (db.prepare('SELECT COALESCE(MAX(sort), -1) AS m FROM gallery').get().m) + 1;
    return db.prepare(`INSERT INTO gallery (title, alt, category, src_full, src_thumb, width, height, external, featured, sort)
                       VALUES (@title, @alt, @category, @src_full, @src_thumb, @width, @height, @external, @featured, @sort)`)
             .run({ external: 0, featured: 0, ...g, sort }).lastInsertRowid;
  },
  update(id, g) {
    return db.prepare('UPDATE gallery SET title = @title, alt = @alt, category = @category, featured = @featured WHERE id = @id').run({ ...g, id });
  },
  reorder(ids) {
    const up = db.prepare('UPDATE gallery SET sort = ? WHERE id = ?');
    db.transaction(() => ids.forEach((id, i) => up.run(i, id)))();
  },
  remove(id) { return db.prepare('DELETE FROM gallery WHERE id = ?').run(id); },
};

const services = {
  all(activeOnly = false) {
    const rows = db.prepare(`SELECT * FROM services ${activeOnly ? 'WHERE active = 1' : ''} ORDER BY sort, id`).all();
    return rows.map(r => ({ ...r, includes: safeJson(r.includes, []) }));
  },
  get(id) { const r = db.prepare('SELECT * FROM services WHERE id = ?').get(id); return r && { ...r, includes: safeJson(r.includes, []) }; },
  create(s) {
    const sort = (db.prepare('SELECT COALESCE(MAX(sort), -1) AS m FROM services').get().m) + 1;
    return db.prepare('INSERT INTO services (name, icon, price, description, includes, cta, active, sort) VALUES (@name, @icon, @price, @description, @includes, @cta, @active, @sort)')
             .run({ ...s, includes: JSON.stringify(s.includes || []), sort }).lastInsertRowid;
  },
  update(id, s) {
    return db.prepare('UPDATE services SET name = @name, icon = @icon, price = @price, description = @description, includes = @includes, cta = @cta, active = @active WHERE id = @id')
             .run({ ...s, includes: JSON.stringify(s.includes || []), id });
  },
  reorder(ids) {
    const up = db.prepare('UPDATE services SET sort = ? WHERE id = ?');
    db.transaction(() => ids.forEach((id, i) => up.run(i, id)))();
  },
  remove(id) { return db.prepare('DELETE FROM services WHERE id = ?').run(id); },
};

const enquiries = {
  all(status) {
    return status
      ? db.prepare('SELECT * FROM enquiries WHERE status = ? ORDER BY created_at DESC').all(status)
      : db.prepare('SELECT * FROM enquiries ORDER BY created_at DESC').all();
  },
  counts() {
    const out = { total: 0 };
    for (const r of db.prepare('SELECT status, COUNT(*) AS n FROM enquiries GROUP BY status').all()) { out[r.status] = r.n; out.total += r.n; }
    return out;
  },
  get(id) { return db.prepare('SELECT * FROM enquiries WHERE id = ?').get(id); },
  create(e) {
    return db.prepare(`INSERT INTO enquiries (name, email, phone, service, preferred_date, message, ip)
                       VALUES (@name, @email, @phone, @service, @preferred_date, @message, @ip)`).run(e).lastInsertRowid;
  },
  setStatus(id, status) { return db.prepare('UPDATE enquiries SET status = ? WHERE id = ?').run(status, id); },
  remove(id) { return db.prepare('DELETE FROM enquiries WHERE id = ?').run(id); },
};

const users = {
  byUsername(u) { return db.prepare('SELECT * FROM users WHERE username = ?').get(u); },
  setPassword(id, password) { return db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(password, 12), id); },
};

function safeJson(str, fallback) { try { return JSON.parse(str); } catch { return fallback; } }

module.exports = { db, settings, gallery, services, enquiries, users, safeJson, DEFAULT_SETTINGS };
