// Admin authentication: cookie-session + bcrypt.
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const env = require('../config/environment');
const User = require('../models/User');

// The session cookie carries a short fingerprint of the user's password hash. Every admin request
// re-checks it against the database, so changing the password signs out every other device — the
// cookie alone can't be revoked, since cookie-session keeps no server-side record of it.
const passwordStamp = hash => crypto.createHmac('sha256', env.SESSION_SECRET).update(hash).digest('base64url').slice(0, 16);

/** The signed-in user, or null (and the session cleared) if the cookie is missing or stale. */
async function currentUser(req) {
  if (!req.session?.userId) return null;
  const user = await User.byId(req.session.userId);
  if (!user || req.session.pwd !== passwordStamp(user.password_hash)) {
    req.session = null;
    return null;
  }
  return user;
}

async function requireAdmin(req, res, next) {
  req.user = await currentUser(req);
  if (req.user) return next();
  if (req.originalUrl.startsWith('/api/')) return res.status(401).json({ success: false, message: 'Not signed in', error: 'UNAUTHENTICATED' });
  return res.redirect('/admin/login');
}

function startSession(req, user) {
  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.pwd = passwordStamp(user.password_hash);
}

async function login(req, res) {
  const { username = '', password = '' } = req.body || {};
  const user = await User.byUsername(String(username).trim());
  if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
    return res.status(401).json({ success: false, message: 'Wrong username or password.', error: 'INVALID_CREDENTIALS' });
  }
  startSession(req, user);
  res.json({ ok: true, username: user.username });
}

function logout(req, res) {
  req.session = null;
  res.json({ ok: true });
}

module.exports = { requireAdmin, currentUser, startSession, login, logout };
