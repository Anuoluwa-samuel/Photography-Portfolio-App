// Adeyemi Visuals — photographer portfolio + admin dashboard
// Node.js 18+ · Express 5 · SQLite (better-sqlite3) · EJS · Sharp · Nodemailer
require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieSession = require('cookie-session');

const publicRoutes = require('./src/routes/public');
const adminRoutes = require('./src/routes/admin');
const { requireAdmin } = require('./src/auth');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const isProd = process.env.NODE_ENV === 'production';

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.startsWith('change-me')) {
  console.warn('[warn] SESSION_SECRET is not set to a real secret. Edit .env before going live.');
}

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
      upgradeInsecureRequests: isProd ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
}));

/* ---------- Parsers & session ---------- */
app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: false, limit: '200kb' }));
app.use(cookieSession({
  name: 'av_admin',
  keys: [process.env.SESSION_SECRET || 'dev-only-secret'],
  maxAge: 12 * 60 * 60 * 1000,      // 12 hours
  httpOnly: true,
  sameSite: 'lax',
  secure: isProd,
}));

/* ---------- Static files ---------- */
app.use(express.static(path.join(__dirname, 'public'), { maxAge: isProd ? '7d' : 0, index: false, redirect: false }));
// Uploads may live outside /public in production (e.g. a persistent disk) — serve them from UPLOAD_DIR too.
app.use('/uploads', express.static(path.resolve(process.env.UPLOAD_DIR || './public/uploads'), { maxAge: isProd ? '30d' : 0 }));

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

app.get('/robots.txt', (req, res) => res.type('text/plain').send('User-agent: *\nDisallow: /admin\nDisallow: /api/\nAllow: /\n'));
app.get('/healthz', (req, res) => res.json({ ok: true }));

/* ---------- Errors ---------- */
app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.status(404).render('404');
});
app.use((err, req, res, next) => {  // eslint-disable-line no-unused-vars
  console.error(err);
  const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Image is too large (max 25 MB).' : (isProd ? 'Something went wrong.' : err.message);
  if (req.path.startsWith('/api/')) return res.status(status).json({ error: msg });
  res.status(status).send(msg);
});

app.listen(PORT, () => {
  console.log(`\n  Adeyemi Visuals is running`);
  console.log(`  Site:   http://localhost:${PORT}`);
  console.log(`  Admin:  http://localhost:${PORT}/admin\n`);
});
