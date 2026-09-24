// The Express application: API, admin pages, uploads, SEO endpoints.
//
// Deliberately has no server.listen() and no Next.js handler, so the same app serves both targets:
//   * server.js                     — local dev / any long-lived Node host; passes the Next handler
//                                     as the terminal middleware.
//   * pages/api/[[...path]].js      — Vercel; Next owns page routing, so unmatched requests 404.
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieSession = require('cookie-session');

const env = require('./config/environment');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const { requireAdmin } = require('./middleware/auth');
const { apiNotFound, errorHandler } = require('./middleware/errorHandler');
const { versionedHtml } = require('./utils/assetVersion');
const { USE_BLOB } = require('./services/imageService');
const { cspDirectives } = require('./config/securityHeaders');

// cwd is the project root both locally and inside a Vercel function (/var/task).
const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, 'public');

/**
 * @param {Function} [terminal] middleware for requests no Express route matched. server.js passes the
 *                              Next.js request handler; on Vercel there is nothing left to try, so 404.
 */
function createApp(terminal) {
  const dev = !env.isProd;
  const app = express();

  app.set('trust proxy', 1);          // correct req.ip / secure cookies behind a reverse proxy (Vercel, Render, nginx)
  app.disable('x-powered-by');

  /* ---------- Security headers ---------- */
  // Directives live in config/securityHeaders so Next can emit the identical set for the pages it
  // renders without entering this app (see next.config.ts headers()).
  app.use(helmet({
    contentSecurityPolicy: { directives: cspDirectives(dev) },
    crossOriginEmbedderPolicy: false,
  }));

  /* ---------- Parsers & session ---------- */
  // cookie-session keeps the whole session in a signed cookie, so it needs no shared store and works
  // unchanged across serverless instances.
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
  // On Vercel these are served from the CDN before a function ever runs; this is for local dev and
  // other Node hosts. With Blob storage uploads are absolute URLs, so /uploads is not served at all.
  app.use(express.static(PUBLIC_DIR, { maxAge: env.isProd ? '7d' : 0, index: false, redirect: false }));
  if (!USE_BLOB) {
    app.use('/uploads', express.static(env.UPLOAD_DIR, { maxAge: env.isProd ? '30d' : 0 }));
  }

  /* ---------- Routes ---------- */
  app.use(publicRoutes);
  app.use(adminRoutes);

  // Admin pages: asset URLs carry a content hash (?v=…) so long-cached CSS/JS refresh right after a deploy.
  // These read public/admin/* from disk, which is why next.config.ts traces that folder into the function.
  const sendAdminPage = (res, file) => {
    res.set('Cache-Control', 'no-cache');
    res.type('html').send(versionedHtml(path.join(PUBLIC_DIR, 'admin', file), PUBLIC_DIR, env.isProd));
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

  /* ---------- Fall-through ---------- */
  app.use('/api', apiNotFound);
  if (terminal) app.use(terminal);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
