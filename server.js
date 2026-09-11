// YIT0 SHOT IT — photography portfolio + admin CMS
// Node.js 18+ · Express 5 · SQLite (better-sqlite3) · EJS · Sharp · Nodemailer
require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieSession = require('cookie-session');

const env = require('./src/config/environment');
require('./src/config/database'); // connects + runs schema/migrations before anything else touches the db

const publicRoutes = require('./src/routes/public');
const adminRoutes = require('./src/routes/admin');
const { requireAdmin } = require('./src/middleware/auth');
const { notFound, errorHandler } = require('./src/middleware/errorHandler');

const app = express();

app.set('trust proxy', 1);          // correct req.ip / secure cookies behind a reverse proxy (Render, Railway, nginx)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.disable('x-powered-by');

/* ---------- Security headers ---------- */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],                   // inline gallery data + JSON-LD
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://images.unsplash.com'], // placeholder photos; remove once you upload your own
      connectSrc: ["'self'"],
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

app.get('/admin/login', (req, res) => {
  if (req.session?.userId) return res.redirect('/admin');
  res.sendFile(path.join(__dirname, 'public', 'admin', 'login.html'));
});
app.get(['/admin', '/admin/*rest'], requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

app.get('/robots.txt', (req, res) => res.type('text/plain').send(
  `User-agent: *\nDisallow: /admin\nDisallow: /api/\nAllow: /\nSitemap: ${env.SITE_URL || `${req.protocol}://${req.get('host')}`}/sitemap.xml\n`
));
app.get('/healthz', (req, res) => res.json({ ok: true }));

/* ---------- Errors ---------- */
app.use(notFound);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`\n  ${env.SITE_NAME} is running`);
  console.log(`  Site:   http://localhost:${env.PORT}`);
  console.log(`  Admin:  http://localhost:${env.PORT}/admin\n`);
});
