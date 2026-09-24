# Deploying to Vercel

Vercel runs this app as serverless functions, so there is no persistent disk. Two pieces of
infrastructure replace it:

| Local | On Vercel |
|---|---|
| SQLite file in `data/` | **Turso** (libSQL — same SQL dialect) |
| Photos in `public/uploads/` | **Vercel Blob** |

`data/*.db` and `public/uploads/*` are both in `.gitignore`, so **neither is deployed**. Step 4 is
not optional — skip it and the site comes up with no content and no photos.

---

## 1. Create a Turso database

```bash
brew install tursodatabase/tap/turso   # or: curl -sSfL https://get.tur.so/install.sh | bash
turso auth login
turso db create yito-shot-it

turso db show yito-shot-it --url       # -> TURSO_DATABASE_URL  (libsql://…)
turso db tokens create yito-shot-it    # -> TURSO_AUTH_TOKEN
```

## 2. Create a Blob store

Vercel dashboard → **Storage** → **Create** → **Blob** → connect it to this project. Vercel sets
`BLOB_READ_WRITE_TOKEN` for you. Copy the value for local use in step 4.

## 3. Set the environment variables

In the Vercel project, under **Settings → Environment Variables**:

| Variable | Value |
|---|---|
| `TURSO_DATABASE_URL` | from step 1 |
| `TURSO_AUTH_TOKEN` | from step 1 |
| `BLOB_READ_WRITE_TOKEN` | set automatically in step 2 |
| `SESSION_SECRET` | a long random string — `openssl rand -hex 32` |
| `ADMIN_USERNAME` | your admin username |
| `ADMIN_PASSWORD` | only read when the admin user is first created |
| `SITE_URL` | `https://your-domain.com` — used for canonical tags and the sitemap |
| `NOTIFY_EMAIL`, `SMTP_*` | optional; enquiries log to the console without them |

## 4. Move your existing content across

Run locally, with the three cloud values exported:

```bash
export TURSO_DATABASE_URL='libsql://…'
export TURSO_AUTH_TOKEN='…'
export BLOB_READ_WRITE_TOKEN='…'

npm run migrate:cloud             # dry run — reports what would move, writes nothing
npm run migrate:cloud -- --go     # do it
```

It creates the schema on the target, uploads every photo the database references to Blob,
rewrites the URLs in the copied rows, and copies all seven tables parents-first so the foreign
keys hold. It refuses to run against a target that already has rows.

**Starting fresh instead?** Use `npm run db:init`, which creates the schema and seeds placeholder
content plus the admin user. Do not run it against a database you are about to migrate into — the
seeded rows collide with the real ones.

To rehearse first, point `TURSO_DATABASE_URL` at a second local file and add `--allow-file-target`.

## 5. Deploy

```bash
npx vercel --prod      # or connect the Git repo in the dashboard
```

## 6. Check it came up

- `/` and a project page render your photos
- `/admin/login` → sign in → dashboard loads
- Upload a photo; confirm the URL returned is a `…public.blob.vercel-storage.com` one
- `/sitemap.xml` and `/robots.txt` respond

---

## Things worth knowing

**Bulk uploads can time out.** Processing is ~1.2s per photo locally and Vercel's CPUs are slower,
so the 20-photo maximum can exceed the 60s function limit in `vercel.json`. Upload in batches of
around 8 if you hit it. 60s is also the ceiling on Vercel's Hobby plan.

**Rate limiting is per-instance.** `express-rate-limit` keeps its counters in memory, so the
6-enquiries-per-15-minutes limit applies per warm function instance rather than globally. It still
blunts casual abuse; a shared store (Upstash) would be needed for a strict global limit.

**Schema changes are a deliberate step.** Seeding is guarded by `SELECT COUNT(*) = 0`, which races
if several cold-starting instances run it at once, so it never runs on a request. Run `npm run
db:init` against the environment yourself after changing the schema.

**Running anywhere else.** Leave `TURSO_*` and `BLOB_*` unset and the app uses a local SQLite file
and the local uploads directory, with `server.js` as the entry point. `render.yaml` and the
`Dockerfile` still describe that setup.
