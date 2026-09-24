// Database connection, schema, seed data and the one-time migration from the old flat
// `gallery` table to the Project -> Images model.
//
// Driver is libSQL: a local file in development, Turso over the network in production. The SQL
// dialect is SQLite either way, so the queries in src/models are unchanged.
//
// Schema and seeding deliberately do NOT run on import. Serverless instances cold-start
// concurrently, and request-time seeding races: every instance sees an empty table and inserts.
// Run `npm run db:init` once per environment instead — at runtime the app only connects.
const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');
const env = require('./environment');
const logger = require('../utils/logger')('db');
const { slugify } = require('../utils/slugify');

const client = createClient({
  url: env.DB_URL,
  ...(env.DB_AUTH_TOKEN ? { authToken: env.DB_AUTH_TOKEN } : {}),
  intMode: 'number',   // INTEGER columns arrive as JS numbers, as better-sqlite3 returned them
});
// No `PRAGMA foreign_keys = ON` here (better-sqlite3 needed it): libSQL enables foreign keys by
// default, so ON DELETE CASCADE / SET NULL are enforced. Verified against both a file: URL and Turso.

/* ------------------------------------------------------------------ */
/* better-sqlite3-shaped shim over the async libSQL client             */
/* The models keep calling prepare().all/get/run — they just await now.*/
/* ------------------------------------------------------------------ */

// better-sqlite3 accepts either positional args (.get(1)) or a single named-parameter object
// (.run({ title, slug })). libSQL matches @name/:name/$name against plain object keys, so the
// SQL itself needs no rewriting.
const bindArgs = (args) => (
  args.length === 1 && args[0] !== null && typeof args[0] === 'object' && !Array.isArray(args[0])
    ? args[0]
    : args
);

// Rebuild each Row as a plain object so spreads, Object.keys and JSON.stringify behave.
const toPlain = (res) => res.rows.map((row) => {
  const out = {};
  for (const col of res.columns) out[col] = row[col];
  return out;
});

// lastInsertRowid comes back as a BigInt; JSON.stringify throws on those, and callers use it as an id.
const toNumber = (v) => (typeof v === 'bigint' ? Number(v) : v);

const db = {
  prepare(sql) {
    return {
      async all(...args) { return toPlain(await client.execute({ sql, args: bindArgs(args) })); },
      async get(...args) { return toPlain(await client.execute({ sql, args: bindArgs(args) }))[0]; },
      async run(...args) {
        const res = await client.execute({ sql, args: bindArgs(args) });
        return { changes: toNumber(res.rowsAffected), lastInsertRowid: toNumber(res.lastInsertRowid) };
      },
    };
  },
  // Multi-statement DDL (the schema block below).
  async exec(sql) { await client.executeMultiple(sql); },
  // Atomic group of independent statements. Dependent inserts (needing lastInsertRowid) stay sequential.
  async batch(statements) { if (statements.length) await client.batch(statements, 'write'); },
  client,
};

const SCHEMA_SQL = `
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

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  location TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT '',
  cover_image TEXT NOT NULL DEFAULT '',
  featured INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category_id);

CREATE TABLE IF NOT EXISTS images (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  src_full TEXT NOT NULL,
  src_thumb TEXT NOT NULL,
  width INTEGER NOT NULL DEFAULT 800,
  height INTEGER NOT NULL DEFAULT 1000,
  caption TEXT NOT NULL DEFAULT '',
  alt TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_images_project ON images(project_id);

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
`;

/* ------------------------------------------------------------------ */
/* Seed data (first run only)                                          */
/* ------------------------------------------------------------------ */
const U  = (id, w, h) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=75`;
const UL = (id)       => `https://images.unsplash.com/photo-${id}?auto=format&fit=max&w=2000&q=85`;

const OLD_BRAND_DEFAULTS = { brand_name: 'Adeyemi', site_name: 'Adeyemi Visuals', seo_title: 'Adeyemi Visuals | Portrait & Wedding Photographer in Lagos, Nigeria' };

const DEFAULT_SETTINGS = {
  // Brand
  brand_name: 'YIT0',
  brand_tagline: 'shot it',
  site_name: 'YIT0 SHOT IT',
  photographer_name: 'Samuel Adeyemi',
  // SEO
  seo_title: 'YIT0 SHOT IT | Portrait & Wedding Photographer in Lagos, Nigeria',
  seo_description: 'YIT0 SHOT IT is a Lagos-based portrait, wedding and editorial photography studio creating cinematic, timeless imagery. View the portfolio, explore services and book a session.',
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
  featured_intro: 'A quick look before the full portfolio: one portrait, one wedding, one editorial. Each was made with available light and a lot of patience.',
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
  portfolio_intro: 'Browse by category or take it all in. Open any project to view the full gallery.',
  services_title: 'What I [[shoot]]',
  services_intro: "Every package includes a planning call, professional editing and a private online gallery. Prices are starting points; tell me about your day and I'll send a proper quote.",
  testimonial_text: "He disappeared into our wedding. We barely noticed him, and then the photos came back and he'd seen everything.",
  testimonial_name: 'Tolu & Damilare',
  testimonial_meta: 'Wedding, Abuja',
  contact_title: "Let's make [[something]]",
  contact_intro: 'Tell me about your session, wedding or campaign. I reply to every enquiry within one working day, and dates go quickly between November and February.',
  // Contact details
  email: 'hello@yito.shotit.com',
  phone: '+234 800 000 0000',
  location: 'Lagos, Nigeria — available across Nigeria and for destination weddings',
  location_short: 'Lagos, Nigeria',
  hours: 'Mon–Sat, 9am–6pm WAT',
  footer_blurb: 'Portrait, wedding and editorial photography with a cinematic eye. Based in Lagos, working everywhere the light is good.',
  // Socials (leave blank to hide)
  social_instagram: 'https://instagram.com/yitoshotit',
  social_facebook: 'https://facebook.com/yitoshotit',
  social_tiktok: 'https://tiktok.com/@yitoshotit',
  social_x: 'https://x.com/yitoshotit',
  social_linkedin: 'https://linkedin.com/in/yitoshotit',
  social_youtube: 'https://youtube.com/@yitoshotit',
};

const DEFAULT_CATEGORIES = [
  { slug: 'portraits',  label: 'Portraits' },
  { slug: 'weddings',   label: 'Weddings' },
  { slug: 'events',     label: 'Events' },
  { slug: 'fashion',    label: 'Fashion' },
  { slug: 'lifestyle',  label: 'Lifestyle' },
  { slug: 'commercial', label: 'Commercial' },
  { slug: 'nature',     label: 'Nature & travel' },
];

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

/* ------------------------------------------------------------------ */
/* Seeds (first run only)                                              */
/* ------------------------------------------------------------------ */
const isEmpty = async (table) => (await db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()).n === 0;

async function seedSettings() {
  if (!(await isEmpty('settings'))) return;
  await db.batch(Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({
    sql: 'INSERT INTO settings (key, value) VALUES (?, ?)', args: [key, value],
  })));
}

async function seedCategories() {
  if (!(await isEmpty('categories'))) return;
  await db.batch(DEFAULT_CATEGORIES.map((c, i) => ({
    sql: 'INSERT INTO categories (slug, label, active, sort) VALUES (?, ?, 1, ?)', args: [c.slug, c.label, i],
  })));
}

// Placeholder demo content — only used on a genuinely fresh install (no projects AND no legacy
// `gallery` table to migrate from). Must run AFTER migrateLegacyGallery(), never before it,
// or real uploaded photos in an existing `gallery` table would be orphaned into the backup table.
async function seedProjectsFallback() {
  if (!(await isEmpty('projects'))) return;
  const cats = await db.prepare('SELECT id, slug FROM categories').all();
  const catBySlug = Object.fromEntries(cats.map((c) => [c.slug, c.id]));
  const insProject = db.prepare(`INSERT INTO projects (title, slug, description, category_id, cover_image, featured, published, sort)
                                  VALUES (@title, @slug, '', @category_id, @cover_image, @featured, 1, @sort)`);
  const insImage = db.prepare(`INSERT INTO images (project_id, src_full, src_thumb, width, height, caption, alt, sort)
                                VALUES (@project_id, @src_full, @src_thumb, @width, @height, @caption, @alt, @sort)`);
  for (const [ci, cat] of DEFAULT_CATEGORIES.entries()) {
    const photos = SEED_GALLERY.filter(([c]) => c === cat.slug);
    if (!photos.length) continue;
    const cover = photos.find((p) => p[6]) || photos[0];
    // Sequential: each image insert needs the project id this returns.
    const { lastInsertRowid: projectId } = await insProject.run({
      title: `${cat.label} collection`, slug: cat.slug,
      category_id: catBySlug[cat.slug], cover_image: U(cover[3], cover[4], cover[5]),
      featured: photos.some((p) => p[6]) ? 1 : 0, sort: ci,
    });
    for (const [i, [, title, alt, img, w, h]] of photos.entries()) {
      await insImage.run({
        project_id: projectId, src_full: UL(img), src_thumb: U(img, w, h), width: w, height: h, caption: title, alt, sort: i,
      });
    }
  }
}

async function seedServices() {
  if (!(await isEmpty('services'))) return;
  await db.batch(SEED_SERVICES.map(([name, icon, price, desc, inc, cta], i) => ({
    sql: 'INSERT INTO services (name, icon, price, description, includes, cta, sort) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: [name, icon, price, desc, JSON.stringify(inc), cta, i],
  })));
}

async function seedUsers() {
  if (!(await isEmpty('users'))) return;
  await db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
          .run(env.ADMIN_USERNAME, bcrypt.hashSync(env.ADMIN_PASSWORD, 12));
  logger.info(`Created admin user "${env.ADMIN_USERNAME}" (password from ADMIN_PASSWORD)`);
}

/* ------------------------------------------------------------------ */
/* One-time migration: legacy flat `gallery` table -> Project + Images */
/* ------------------------------------------------------------------ */
async function migrateLegacyGallery() {
  const hasGalleryTable = await db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='gallery'`).get();
  if (!hasGalleryTable) return;

  const legacyRows = await db.prepare('SELECT * FROM gallery ORDER BY sort, id').all();
  const projectCount = (await db.prepare('SELECT COUNT(*) AS n FROM projects').get()).n;

  // Only migrate if projects haven't already been seeded/created from this legacy data.
  if (legacyRows.length && projectCount === 0) {
    const cats = await db.prepare('SELECT id, slug, label FROM categories').all();
    const catBySlug = Object.fromEntries(cats.map((c) => [c.slug, c]));
    const byCategory = new Map();
    for (const row of legacyRows) {
      if (!byCategory.has(row.category)) byCategory.set(row.category, []);
      byCategory.get(row.category).push(row);
    }
    const insProject = db.prepare(`INSERT INTO projects (title, slug, description, category_id, cover_image, featured, published, sort)
                                    VALUES (@title, @slug, '', @category_id, @cover_image, @featured, 1, @sort)`);
    const insImage = db.prepare(`INSERT INTO images (project_id, src_full, src_thumb, width, height, caption, alt, sort)
                                  VALUES (@project_id, @src_full, @src_thumb, @width, @height, @caption, @alt, @sort)`);
    let sort = 0;
    for (const [catSlug, rows] of byCategory) {
      const cat = catBySlug[catSlug];
      const cover = rows.find((r) => r.featured) || rows[0];
      const { lastInsertRowid: projectId } = await insProject.run({
        title: `${cat ? cat.label : catSlug} collection`,
        slug: cat ? cat.slug : slugify(catSlug),
        category_id: cat ? cat.id : null,
        cover_image: cover.src_thumb,
        featured: rows.some((r) => r.featured) ? 1 : 0,
        sort: sort++,
      });
      for (const [i, r] of rows.entries()) {
        await insImage.run({
          project_id: projectId, src_full: r.src_full, src_thumb: r.src_thumb,
          width: r.width, height: r.height, caption: r.title, alt: r.alt, sort: i,
        });
      }
    }
    logger.info(`Migrated ${legacyRows.length} legacy gallery photo(s) into ${byCategory.size} project(s).`);
  }

  await db.exec('ALTER TABLE gallery RENAME TO gallery_legacy_backup');
  logger.info('Renamed legacy gallery table to gallery_legacy_backup (kept, not deleted).');
}

/* One-time rebrand: only overwrite settings that still hold the old defaults, never a customized value. */
async function migrateBrandRename() {
  for (const [key, oldValue] of Object.entries(OLD_BRAND_DEFAULTS)) {
    const row = await db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    if (row?.value === oldValue) {
      await db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(DEFAULT_SETTINGS[key], key);
      logger.info(`Renamed settings.${key}: "${oldValue}" -> "${DEFAULT_SETTINGS[key]}"`);
    }
  }
}

/**
 * Create the schema, seed first-run data and apply the one-time migrations.
 * Idempotent, but must not be run concurrently — call it from `npm run db:init`, not per request.
 */
async function init() {
  await db.exec(SCHEMA_SQL);
  await seedSettings();
  await seedCategories();
  await migrateLegacyGallery();
  await seedProjectsFallback(); // only fires if there was no legacy gallery table AND projects is still empty
  await seedServices();
  await seedUsers();
  await migrateBrandRename();
  return { url: env.DB_URL };
}

module.exports = { db, init, client, DEFAULT_SETTINGS, DEFAULT_CATEGORIES };
