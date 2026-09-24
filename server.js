// YIT0 SHOT IT — photography portfolio + admin CMS
// Node.js 20.9+ · Express 5 (admin, API, uploads) · Next.js 16 (public site) · SQLite · Sharp · Nodemailer
if (process.argv.includes('--production')) process.env.NODE_ENV = 'production';
require('dotenv').config();

const http = require('http');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieSession = require('cookie-session');
const next = require('next');

const env = require('./src/config/environment');
const { init: initDb } = require('./src/config/database');

const publicRoutes = require('./src/routes/public');
const adminRoutes = require('./src/routes/admin');
const { requireAdmin } = require('./src/middleware/auth');
const { apiNotFound, errorHandler } = require('./src/middleware/errorHandler');
const { versionedHtml } = require('./src/utils/assetVersion');

const dev = !env.isProd;
const app = express();
const server = http.createServer(app);
const nextApp = next({ dev, dir: __dirname, httpServer: server });
const handleNext = nextApp.getRequestHandler();

app.set('trust proxy', 1);          // correct req.ip / secure cookies behind a reverse proxy (Render, Railway, nginx)
app.disable('x-powered-by');

/* ---------- Security headers ---------- */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // Next.js streams page data through inline scripts; dev mode also needs eval for React's debug tooling.
      scriptSrc: ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : [])],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      // unsplash = placeholder photos (remove once you upload your own);
      // *.public.blob.vercel-storage.com = uploads once BLOB_READ_WRITE_TOKEN is set.
      imgSrc: ["'self'", 'data:', 'blob:', 'https://images.unsplash.com', 'https://*.public.blob.vercel-storage.com'],
      connectSrc: ["'self'", ...(dev ? ['ws:', 'wss:'] : [])],             // dev: hot reload websocket
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: env.isProd ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
}));

/* ---------- Parsers & session ---------- */
app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: false, limit: '200kb' }));
app.use(cookieSession({
  name: 'yss_admin',
  keys: [env.SESSION_SECRET],
  maxAge: 12 * 60 * 60 * 1000,      // 12 hours
  httpOnly: true,
  sameSite: 'lax',
  secure: env.isProd,
}));

/* ---------- Static files ---------- */
app.use(express.static(path.join(__dirname, 'public'), { maxAge: env.isProd ? '7d' : 0, index: false, redirect: false }));
// Uploads may live outside /public in production (e.g. a persistent disk) — serve them from UPLOAD_DIR too.
app.use('/uploads', express.static(env.UPLOAD_DIR, { maxAge: env.isProd ? '30d' : 0 }));

/* ---------- Routes ---------- */
app.use(publicRoutes);
app.use(adminRoutes);

// Admin pages: asset URLs carry a content hash (?v=…) so long-cached CSS/JS refresh right after a deploy.
const sendAdminPage = (res, file) => {
  res.set('Cache-Control', 'no-cache');
  res.type('html').send(versionedHtml(path.join(__dirname, 'public', 'admin', file), path.join(__dirname, 'public'), env.isProd));
};
app.get('/admin/login', (req, res) => {
  if (req.session?.userId) return res.redirect('/admin');
  sendAdminPage(res, 'login.html');
});
app.get(['/admin', '/admin/*rest'], requireAdmin, (req, res) => {
  sendAdminPage(res, 'index.html');
});

app.get('/robots.txt', (req, res) => res.type('text/plain').send(
  `User-agent: *\nDisallow: /admin\nDisallow: /api/\nAllow: /\nSitemap: ${env.SITE_URL || `${req.protocol}://${req.get('host')}`}/sitemap.xml\n`
));
app.get('/healthz', (req, res) => res.json({ ok: true }));

/* ---------- Public site (Next.js app/ directory) ---------- */
app.use('/api', apiNotFound);
app.use((req, res) => handleNext(req, res));

/* ---------- Errors ---------- */
app.use(errorHandler);

// Local convenience: ensure the schema exists before serving. In production the schema is created
// once by `npm run db:init`, never per boot — concurrent serverless instances would race.
const prepare = env.isProd ? nextApp.prepare() : initDb().then(() => nextApp.prepare());

prepare.then(() => {
  server.listen(env.PORT, () => {
    console.log(`\n  ${env.SITE_NAME} is running (${dev ? 'development' : 'production'})`);
    console.log(`  Site:   http://localhost:${env.PORT}`);
    console.log(`  Admin:  http://localhost:${env.PORT}/admin\n`);
  });
}).catch(err => {
  console.error(err);
  if (!dev) console.error('\n  Did you run `npm run build` first?\n');
  process.exit(1);
});
