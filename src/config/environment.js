// Central place for reading/validating environment variables.
const path = require('path');
const logger = require('../utils/logger')('env');

const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT || 3000);

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.startsWith('change-me')) {
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
