// Central place for reading/validating environment variables.
const path = require('path');
const logger = require('../utils/logger')('env');

const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT || 3000);

// The session secret signs the admin cookie; anyone who knows it can forge a login. In production a
// missing, placeholder or short one is fatal rather than a warning (the live site once ran on the
// .env.example value). `next build` also runs with NODE_ENV=production, so the build phase is exempt.
const secret = process.env.SESSION_SECRET || '';
const weakSecret = !secret || secret.startsWith('change-me') || secret === 'dev-only-secret' || secret.length < 32;
if (weakSecret) {
  if (isProd && process.env.NEXT_PHASE !== 'phase-production-build') {
    throw new Error('SESSION_SECRET must be a random string of at least 32 characters (openssl rand -hex 32). Refusing to start.');
  }
  logger.warn('SESSION_SECRET is not set to a real secret. Edit .env before going live.');
}

// Public base URL for canonical / Open Graph / sitemap links. An explicit SITE_URL wins, except a
// localhost one copied over from .env into a Vercel deploy; there, fall back to the project's
// production domain (Vercel sets this to the custom domain once one is attached). '' means
// "derive it from the request host".
function resolveSiteUrl() {
  const explicit = (process.env.SITE_URL || '').replace(/\/+$/, '');
  const onVercel = Boolean(process.env.VERCEL);
  if (explicit && !(onVercel && /\/\/(localhost|127\.0\.0\.1)\b/.test(explicit))) return explicit;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return '';
}

module.exports = {
  isProd,
  PORT,
  SITE_NAME: 'YIT0 SHOT IT',
  SESSION_SECRET: process.env.SESSION_SECRET || 'dev-only-secret',
  SITE_URL: resolveSiteUrl(),
  // These are runtime-only paths (local disk / a mounted volume). The turbopackIgnore comments stop
  // Next's file tracer from seeing a dynamic path.resolve and, to be safe, pulling the entire project
  // — public/ included — into the serverless bundle. public/admin is traced in explicitly via
  // outputFileTracingIncludes in next.config.ts instead.
  DATA_DIR: path.resolve(/* turbopackIgnore: true */ process.env.DATA_DIR || './data'),
  UPLOAD_DIR: path.resolve(/* turbopackIgnore: true */ process.env.UPLOAD_DIR || './public/uploads'),
  // libSQL: a local file in dev, a Turso URL (libsql://…) in production.
  DB_URL: process.env.TURSO_DATABASE_URL || `file:${path.resolve(/* turbopackIgnore: true */ process.env.DATA_DIR || './data', 'site.db')}`,
  DB_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN || undefined,
  // Vercel Blob replaces the local uploads disk once BLOB_READ_WRITE_TOKEN is set.
  BLOB_TOKEN: process.env.BLOB_READ_WRITE_TOKEN || '',
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'ChangeMe123!',
};
