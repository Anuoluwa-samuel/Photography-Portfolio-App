const env = require('../config/environment');
const logger = require('../utils/logger')('error');

// Unknown /api/* routes get JSON; every other unmatched path falls through to Next.js (which renders app/not-found.tsx).
function apiNotFound(req, res) {
  res.status(404).json({ success: false, message: 'Not found', error: 'NOT_FOUND' });
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  logger.error(err);
  const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  const message = err.code === 'LIMIT_FILE_SIZE' ? 'Image is too large (max 25 MB).' : (env.isProd ? 'Something went wrong.' : err.message);
  if (req.path.startsWith('/api/')) return res.status(status).json({ success: false, message, error: err.code || 'SERVER_ERROR' });
  res.status(status).send(message);
}

module.exports = { apiNotFound, errorHandler };
