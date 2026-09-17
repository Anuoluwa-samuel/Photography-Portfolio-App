# YIT0 SHOT IT — Photography Portfolio + Admin CMS

A premium gold photography portfolio (whitish-gradient light theme + dark mode) built around **Projects**: each project is a titled, categorized collection of photos with its own page at `/projects/:slug`. Everything — projects, categories, services, homepage copy, enquiries — is managed from a built-in admin CMS. The whole app runs from one Node.js process with a single SQLite file, so there is no separate database server to install.

| Layer | Choice | Why |
|---|---|---|
| Runtime | **Node.js 20.9+** | One language front to back |
| Server | **Express 5** | Small, well documented |
| Database | **SQLite** via `better-sqlite3` | Zero setup, one file, easy backups |
| Public site | **Next.js 16 (App Router) + React 19 + TypeScript** | Homepage & project pages are server-rendered from the database → great for SEO |
| Styling | **Tailwind CSS v4 + shadcn structure** | Design tokens for light/dark themes, glassmorphism utilities, `components/ui` |
| Motion | **framer-motion + lucide-react + Canvas 2D** | Hover-gradient nav, silk background, sonar dot field, bokeh — all respect `prefers-reduced-motion` |
| Carousels & dialogs | **Embla (shadcn Carousel) + Radix (shadcn Dialog)** | Featured "rack focus" reel, endless portfolio strip, booking popup |
| Images | **Multer + Sharp** | Uploads are auto-converted to WebP (2000px full + 900px thumb) |
| Email | **Nodemailer** | New enquiries emailed to the photographer (optional) |
| Auth | **bcryptjs + cookie-session** | Single admin login, signed cookie, rate-limited |
| Hardening | **Helmet + express-rate-limit** | CSP, secure headers, spam/brute-force limits |
| Admin frontend | Vanilla HTML/CSS/JS | No build step; same look as the site via `admin.css`, `theme.js`, `effects.js` |

## 1. Run it locally (5 minutes)

```bash
# 1. Install Node.js 20.9 or newer from https://nodejs.org (LTS is fine)
# 2. In this folder:
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run dev               # development (hot reload)

# production
npm run build
npm start
```

Open **http://localhost:3000** for the site and **http://localhost:3000/admin** for the dashboard.

Default login (from `.env`): username `admin`, password `ChangeMe123!` — change it in *Admin → Account* or with `npm run change-password`.

> The admin user is created only the first time the database is created. Changing `ADMIN_PASSWORD` in `.env` afterwards does nothing — use the dashboard or the script.

## 2. What the admin dashboard does

| Section | You can… |
|---|---|
| **Overview** | See project / photo / category / enquiry counts, recent projects, recent enquiries |
| **Enquiries** | Read every contact-form submission, filter by status (new / read / replied / archived), reply by email, delete |
| **Projects** | Create/edit/delete projects (title, category, location, date, description), publish or save as a draft, mark as featured, drag to reorder, upload photos into each project, set the cover photo, edit captions/alt text, drag to reorder photos |
| **Categories** | Create / rename / hide / reorder / delete the categories projects are grouped by |
| **Services** | Add / edit / hide / reorder services, prices, inclusions and button labels |
| **Site content** | Every piece of text on the homepage: brand name, hero headline, bio, stats, approach points, testimonial, contact details, social links, SEO title/description. Upload the hero image and about portrait |
| **Account** | Change your password |

All changes are live immediately — the homepage and every project page are rendered from the database on every request. A project only appears on the public site once it's **published**; drafts stay admin-only.

**Accent word:** in any heading, wrap the word you want in gold with double brackets: `Light that [[remembers]] the moment`.

## 3. Replacing the placeholder photos

On first run, the database seeds one placeholder project per category with Unsplash photos. Delete them from **Projects** and create real projects with the photographer's own work. Once no placeholder photos remain you can remove `https://images.unsplash.com` from the CSP `imgSrc` list in `server.js`.

Uploads are stored in `public/uploads/` (configurable via `UPLOAD_DIR`) and served at `/uploads/...`.

## 4. Email notifications

Fill in the `SMTP_*` values in `.env` (Gmail app password, Zoho, Brevo, Resend SMTP, etc.) and `NOTIFY_EMAIL`. Without SMTP settings, enquiries are still saved to the database and printed to the server log.

## 5. Deploying

**Before going live:** set `NODE_ENV=production`, a long random `SESSION_SECRET`, a strong `ADMIN_PASSWORD`, and `SITE_URL` to your real domain (used for canonical/Open Graph/sitemap URLs).

- **Render / Railway / Fly.io** — connect the repo; `render.yaml` is included (attach a persistent disk so uploads and the DB survive deploys).
- **VPS (Ubuntu + nginx)** — `npm ci && npm run build`, run with `pm2 start server.js --name portfolio -- --production`, reverse-proxy port 3000 through nginx with a Let's Encrypt certificate.
- **Docker** — `docker compose up -d` (Dockerfile + docker-compose.yml included; `data/` and `public/uploads/` are mounted volumes).

**Every deploy needs a build step** (`npm run build`) before `npm start` — `render.yaml` and the `Dockerfile` already do this.

**Caching:** public assets are cached for 7 days. Next.js fingerprints its own files, and the admin pages add a content hash to their CSS/JS links (`src/utils/assetVersion.js`), so changes show up immediately after a deploy without hard refreshes.

Shared cPanel hosting without Node.js support will not run this project.

## 6. Project structure

```
server.js                        Express app: security headers, sessions, static files, API/admin routes;
                                 hands every other request to Next.js
app/                             Next.js App Router: layout (fonts, theme), homepage, projects/[slug], not-found, globals.css
components/
  ui/                            shadcn-style primitives: action-button, floating-field, glass-card, dialog, carousel,
                                 hover-gradient-nav-bar, silk-background-animation, sonar-grid, bokeh-background
  site/                          Page sections (home-sections), site-nav, site-footer, site-sonar, booking-provider,
                                 enquiry-form, featured-reel, portfolio-carousel, project-gallery (lightbox),
                                 viewfinder-corners, motion (reveal, SmartImage, curtain, counters)
  icons/sprite.tsx               Inline SVG icon set (ids used by the CMS)
  theme-provider.tsx, theme-toggle.tsx
hooks/use-reduced-motion.ts      Hydration-safe prefers-reduced-motion hook
lib/                             data.ts (reads src/models), utils.ts (cn), site.ts (nav links), text.tsx
src/
  config/
    environment.js               Env var reads/validation
    database.js                  SQLite schema, seed content, legacy-data migration
  models/                        One query module per table (Project, Image, Category,
                                  Service, Enquiry, Settings, User)
  controllers/                   Request handlers (projectController, categoryController,
                                  serviceController, enquiryController, settingsController,
                                  authController, dashboardController, publicController)
  middleware/
    auth.js                      requireAdmin / login / logout
    upload.js                    Multer config for image uploads
    validation.js                Public enquiry-form validation
    errorHandler.js              API 404 + error JSON/HTML responses
  services/
    imageService.js              Sharp pipeline (upload → WebP full + thumb)
    emailService.js               Enquiry email notification
  utils/
    slugify.js, text.js, logger.js
    assetVersion.js              Adds ?v=<content hash> to admin CSS/JS links (cache-busting)
  routes/
    public.js                    GET /sitemap.xml, public JSON, POST /api/enquiries
    admin.js                     /api/admin/*  (projects, categories, services, enquiries, settings, auth)
  constants.js                   Icons, socials, enquiry statuses (categories now live in the database)
public/
  admin/                         Dashboard (login.html, index.html, admin.css, admin.js,
                                 theme.js = shared light/dark, effects.js = silk/sonar/bokeh ports)
  uploads/                       Uploaded photos (gallery/, site/)
scripts/
  change-password.js             npm run change-password
  reset-db.js                    npm run reset-db   (wipes DB + uploads, re-seeds placeholders)
  check-grid.js                  npm run check:grid (8-point grid check; --fix snaps values)
data/site.db                     SQLite database (created on first run)
```

## 7. API summary

Public
- `GET /` homepage · `GET /projects/:slug` (Next.js) · `GET /sitemap.xml`
- `GET /api/projects` · `GET /api/categories` · `GET /api/services` · `POST /api/enquiries`

Admin (session required)
- `POST /api/admin/login` · `POST /api/admin/logout` · `GET /api/admin/me` · `POST /api/admin/password`
- `GET /api/admin/summary`
- `GET|PATCH|DELETE /api/admin/enquiries[/:id]`
- `GET|POST /api/admin/projects` · `PATCH|DELETE /api/admin/projects/:id` · `PUT /api/admin/projects/order`
- `POST /api/admin/projects/:id/images` (multipart `photos[]`) · `PATCH|DELETE /api/admin/projects/:id/images/:imageId` · `PUT /api/admin/projects/:id/images/order`
- `GET|POST /api/admin/categories` · `PATCH|DELETE /api/admin/categories/:id` · `PUT /api/admin/categories/order`
- `GET|POST /api/admin/services` · `PATCH|DELETE /api/admin/services/:id` · `PUT /api/admin/services/order`
- `GET|PUT /api/admin/settings` · `POST /api/admin/settings/image/:key` (`hero_image` | `about_image`)

## 8. Backups

Copy `data/site.db` and the `public/uploads/` folder. That is the entire site state.

## 9. Design system

- **Themes** — tokens live in `app/globals.css`: a whitish-gradient light theme (default) and a dark theme (`.dark`, via next-themes). The admin reads the same `localStorage` key (`theme`), so the choice follows you between site and dashboard.
- **Site-wide layers** (`app/layout.tsx`) — `SilkBackground` (fixed animated silk) and `SiteSonar` (one fixed sonar dot field for every page). The crosshair cursor and tap-to-ping only apply over empty background; see `isEmptySpace` in `components/site/site-sonar.tsx`.
- **Booking popup** — any element with `data-book` opens it (`data-book="Wedding photography"` pre-selects that service). Links keep a real `#contact` href as the no-JavaScript fallback; `/#book` opens it directly.
- **Signature details** — autofocus brackets + shutter flash on buttons (`ActionButton`), floating labels with viewfinder focus (`FloatingField`), bokeh that racks into focus behind forms, a "rack focus" featured reel, and an endless portfolio strip whose cards "develop in" when filtered.
- **Reduced motion** — every effect has a calm fallback. When reduced motion changes what is *rendered*, use `useReducedMotionPreference` from `hooks/use-reduced-motion.ts` (not framer-motion's `useReducedMotion`) to avoid hydration mismatches.
- **Admin parity** — `public/admin/effects.js` is a vanilla port of the silk, sonar and bokeh components; keep its palettes in sync when changing the React versions.

## 10. Front-end conventions

- **8-point grid** — spacing, sizing and radii are multiples of 8px, with 4px half-steps allowed below 24px. Exempt: typography, ≤ 2px borders, blur/shadow, breakpoints, ≤ 4px motion nudges. `npm run check:grid` lists violations (non-zero exit); `node scripts/check-grid.js --fix` snaps them.
- **Before pushing** — `npm run typecheck`, `npm run check:grid`, `npm run build`.
- **Adding shadcn components** — `npx shadcn@latest add <name>`, then check the generated file: the CLI currently writes `import { cn } from "cn"` and installs an unrelated `cn` npm package, and may add a `components/ui/button.tsx` that needs `class-variance-authority`. Change the import to `@/lib/utils`, run `npm uninstall cn`, and use `ActionButton` instead of the generated Button.
