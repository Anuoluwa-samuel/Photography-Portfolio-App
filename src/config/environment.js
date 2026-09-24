// Central place for reading/validating environment variables.
const path = require('path');
const logger = require('../utils/logger')('env');

const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT || 3000);

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.startsWith('change-me')) {
  logger.warn('SESSION_SECRET is not set to a real secret. Edit .env before going live.');
}

module.exports = {
  isProd,
  PORT,
  SITE_NAME: 'YIT0 SHOT IT',
  SESSION_SECRET: process.env.SESSION_SECRET || 'dev-only-secret',
  SITE_URL: process.env.SITE_URL || '',
  DATA_DIR: path.resolve(process.env.DATA_DIR || './data'),
  UPLOAD_DIR: path.resolve(process.env.UPLOAD_DIR || './public/uploads'),
  // libSQL: a local file in dev, a Turso URL (libsql://…) in production.
  DB_URL: process.env.TURSO_DATABASE_URL || `file:${path.resolve(process.env.DATA_DIR || './data', 'site.db')}`,
  DB_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN || undefined,
  // Vercel Blob replaces the local uploads disk once BLOB_READ_WRITE_TOKEN is set.
  BLOB_TOKEN: process.env.BLOB_READ_WRITE_TOKEN || '',
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'ChangeMe123!',
};
