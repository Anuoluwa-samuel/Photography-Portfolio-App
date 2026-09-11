# YIT0 SHOT IT — Photography Portfolio + Admin CMS

A premium, dark-teal photography portfolio built around **Projects**: each project is a titled, categorized collection of photos with its own page at `/projects/:slug`. Everything — projects, categories, services, homepage copy, enquiries — is managed from a built-in admin CMS. The whole app runs from one Node.js process with a single SQLite file, so there is no separate database server to install.

| Layer | Choice | Why |
|---|---|---|
| Runtime | **Node.js 18+** | One language front to back |
| Server | **Express 5** | Small, well documented |
| Database | **SQLite** via `better-sqlite3` | Zero setup, one file, easy backups |
| Templates | **EJS** | Homepage & project pages are server-rendered from the database → great for SEO |
| Images | **Multer + Sharp** | Uploads are auto-converted to WebP (2000px full + 900px thumb) |
| Email | **Nodemailer** | New enquiries emailed to the photographer (optional) |
| Auth | **bcryptjs + cookie-session** | Single admin login, signed cookie, rate-limited |
| Hardening | **Helmet + express-rate-limit** | CSP, secure headers, spam/brute-force limits |
| Frontend | Vanilla HTML/CSS/JS | No build step, no framework lock-in |

## 1. Run it locally (5 minutes)

```bash
# 1. Install Node.js 18 or newer from https://nodejs.org (LTS is fine)
# 2. In this folder:
npm install
cp .env.example .env      # Windows: copy .env.example .env
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

**Accent word:** in any heading, wrap the word you want in teal with double brackets: `Light that [[remembers]] the moment`.

## 3. Replacing the placeholder photos

On first run, the database seeds one placeholder project per category with Unsplash photos. Delete them from **Projects** and create real projects with the photographer's own work. Once no placeholder photos remain you can remove `https://images.unsplash.com` from the CSP `imgSrc` list in `server.js`.

Uploads are stored in `public/uploads/` (configurable via `UPLOAD_DIR`) and served at `/uploads/...`.

## 4. Email notifications

Fill in the `SMTP_*` values in `.env` (Gmail app password, Zoho, Brevo, Resend SMTP, etc.) and `NOTIFY_EMAIL`. Without SMTP settings, enquiries are still saved to the database and printed to the server log.

## 5. Deploying

**Before going live:** set `NODE_ENV=production`, a long random `SESSION_SECRET`, a strong `ADMIN_PASSWORD`, and `SITE_URL` to your real domain (used for canonical/Open Graph/sitemap URLs).

- **Render / Railway / Fly.io** — connect the repo; `render.yaml` is included (attach a persistent disk so uploads and the DB survive deploys).
- **VPS (Ubuntu + nginx)** — `npm ci --omit=dev`, run with `pm2 start server.js --name portfolio`, reverse-proxy port 3000 through nginx with a Let's Encrypt certificate.
- **Docker** — `docker compose up -d` (Dockerfile + docker-compose.yml included; `data/` and `public/uploads/` are mounted volumes).

Shared cPanel hosting without Node.js support will not run this project.

## 6. Project structure

```
server.js                        Express app: security headers, sessions, static files, routes
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
    errorHandler.js              404 + error JSON/HTML responses
  services/
    imageService.js              Sharp pipeline (upload → WebP full + thumb)
    emailService.js               Enquiry email notification
  utils/
    slugify.js, text.js, logger.js
  routes/
    public.js                    GET /, GET /projects/:slug, GET /sitemap.xml, public JSON, POST /api/enquiries
    admin.js                     /api/admin/*  (projects, categories, services, enquiries, settings, auth)
  constants.js                   Icons, socials, enquiry statuses (categories now live in the database)
views/public/
  index.ejs                      Homepage (projects grid, featured, about, services, contact)
  project.ejs                    One project's detail page + lightbox gallery
  _sprite.ejs                    Inline SVG icon set
  404.ejs
public/
  css/site.css                   Design system + site styles
  js/site.js                     Nav, reveal animations, portfolio filters, lightbox, contact form
  admin/                         Dashboard (login.html, index.html, admin.css, admin.js)
  uploads/                       Uploaded photos (gallery/, site/)
scripts/
  change-password.js             npm run change-password
  reset-db.js                    npm run reset-db   (wipes DB + uploads, re-seeds placeholders)
data/site.db                     SQLite database (created on first run)
```

## 7. API summary

Public
- `GET /` homepage · `GET /projects/:slug` · `GET /sitemap.xml`
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
