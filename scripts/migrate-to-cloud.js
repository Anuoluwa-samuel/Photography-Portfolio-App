// One-time migration: local SQLite + local uploads  ->  Turso + Vercel Blob.
//
//   npm run migrate:cloud            # dry run: report what would move, change nothing
//   npm run migrate:cloud -- --go    # actually copy
//
// To rehearse the whole thing locally first, point TURSO_DATABASE_URL at a second file and add
// --allow-file-target. Same code path, nothing remote touched.
//
// Reads the source database from DATA_DIR (default ./data/site.db) and the source photos from
// UPLOAD_DIR (default ./public/uploads), and needs TURSO_DATABASE_URL, TURSO_AUTH_TOKEN and
// BLOB_READ_WRITE_TOKEN in the environment for the destination.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');
const { SCHEMA_SQL } = require('../src/config/database');

const GO = process.argv.includes('--go');
const ALLOW_FILE_TARGET = process.argv.includes('--allow-file-target'); // rehearse locally
const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || './public/uploads');
const SOURCE_URL = `file:${path.join(DATA_DIR, 'site.db')}`;
const { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, BLOB_READ_WRITE_TOKEN } = process.env;

// Parents before children: projects.category_id and images.project_id are enforced foreign keys.
const TABLES = ['settings', 'users', 'categories', 'services', 'projects', 'images', 'enquiries'];
// Columns that may hold a local /uploads/... URL needing a Blob upload.
const URL_COLUMNS = { images: ['src_full', 'src_thumb'], projects: ['cover_image'] };
const URL_SETTINGS = ['hero_image', 'about_image'];

const die = (msg) => { console.error(`\n  ${msg}\n`); process.exit(1); };
const rowsOf = (res) => res.rows.map((row) => Object.fromEntries(res.columns.map((c) => [c, row[c]])));

async function main() {
  if (!fs.existsSync(path.join(DATA_DIR, 'site.db'))) die(`No source database at ${DATA_DIR}/site.db`);
  if (!TURSO_DATABASE_URL) die('TURSO_DATABASE_URL is not set — see .env.example');
  if (TURSO_DATABASE_URL.startsWith('file:') && !ALLOW_FILE_TARGET) die('TURSO_DATABASE_URL points at a local file; that is the source, not a destination (use --allow-file-target to rehearse)');
  if (TURSO_DATABASE_URL === SOURCE_URL) die('Source and target are the same database');

  const source = createClient({ url: SOURCE_URL, intMode: 'number' });
  const target = createClient({ url: TURSO_DATABASE_URL, authToken: TURSO_AUTH_TOKEN, intMode: 'number' });

  console.log(`\n  source : ${SOURCE_URL}`);
  console.log(`  target : ${TURSO_DATABASE_URL}`);
  console.log(`  photos : ${UPLOAD_DIR} -> ${BLOB_READ_WRITE_TOKEN ? 'Vercel Blob' : '(no BLOB_READ_WRITE_TOKEN — URLs left as-is)'}`);
  console.log(`  mode   : ${GO ? 'APPLY' : 'dry run (pass --go to apply)'}\n`);

  // Create the tables on the target if they aren't there. Deliberately not `npm run db:init`, which
  // would also seed placeholder content that the real rows below would then collide with.
  if (GO) await target.executeMultiple(SCHEMA_SQL);
  else console.log('  (dry run: target schema not created)\n');

  // Refuse to clobber a destination that already holds content.
  for (const t of ['projects', 'settings']) {
    const existing = await target.execute(`SELECT COUNT(*) AS n FROM ${t}`).then((r) => r.rows[0].n).catch(() => null);
    if (existing === null) { if (GO) die(`Target is missing the "${t}" table after schema creation.`); continue; }
    if (existing > 0) die(`Target already has ${existing} row(s) in "${t}". Refusing to overwrite — empty it first if this is intentional.`);
  }

  /* ---------- photos ---------- */
  const urlMap = new Map();            // local /uploads/... -> absolute Blob URL
  const localUrls = new Set();
  for (const [table, cols] of Object.entries(URL_COLUMNS)) {
    for (const r of rowsOf(await source.execute(`SELECT ${cols.join(',')} FROM ${table}`))) {
      for (const c of cols) if (typeof r[c] === 'string' && r[c].startsWith('/uploads/')) localUrls.add(r[c]);
    }
  }
  const settingRows = rowsOf(await source.execute({
    sql: `SELECT key, value FROM settings WHERE key IN (${URL_SETTINGS.map(() => '?').join(',')})`,
    args: URL_SETTINGS,
  }));
  for (const r of settingRows) {
    if (typeof r.value === 'string' && r.value.startsWith('/uploads/')) localUrls.add(r.value);
  }

  console.log(`  ${localUrls.size} local photo URL(s) referenced by the database`);
  let missing = 0;
  for (const url of localUrls) {
    const file = path.join(UPLOAD_DIR, url.replace(/^\/uploads\//, ''));
    if (!fs.existsSync(file)) { console.log(`    MISSING  ${url}`); missing++; continue; }
    const bytes = fs.statSync(file).size;
    if (!GO || !BLOB_READ_WRITE_TOKEN) { console.log(`    ${GO ? 'skip' : 'would upload'}  ${url}  (${(bytes / 1024).toFixed(0)}KB)`); continue; }
    const { put } = require('@vercel/blob');
    const res = await put(url.replace(/^\/uploads\//, ''), fs.readFileSync(file), {
      access: 'public', token: BLOB_READ_WRITE_TOKEN, contentType: 'image/webp', addRandomSuffix: false,
      // Re-runs are normal (a failed attempt, or moving the database to another region while the
      // same Blob store is reused), and the bytes are identical, so overwrite rather than fail.
      allowOverwrite: true,
    });
    urlMap.set(url, res.url);
    console.log(`    uploaded ${url}  ->  ${res.url}`);
  }
  if (missing) console.log(`\n  ${missing} referenced file(s) are missing on disk; those rows keep their existing URL.`);

  /* ---------- rows ---------- */
  console.log('');
  for (const table of TABLES) {
    const rows = rowsOf(await source.execute(`SELECT * FROM ${table}`));
    if (!rows.length) { console.log(`  ${table.padEnd(11)} 0 rows`); continue; }
    const cols = Object.keys(rows[0]);
    const statements = rows.map((row) => {
      const values = cols.map((c) => {
        const v = row[c];
        if (typeof v === 'string' && urlMap.has(v)) return urlMap.get(v);
        return v;
      });
      return { sql: `INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`, args: values };
    });
    if (GO) await target.batch(statements, 'write');
    console.log(`  ${table.padEnd(11)} ${String(rows.length).padStart(3)} rows${GO ? ' copied' : ' would copy'}`);
  }

  console.log(GO
    ? '\n  Done. Point the app at the same TURSO_* / BLOB_* values and verify before switching DNS.\n'
    : '\n  Dry run only — nothing was written. Re-run with --go to apply.\n');
}

main().catch((err) => { console.error('\n  Migration failed:\n', err); process.exit(1); });
