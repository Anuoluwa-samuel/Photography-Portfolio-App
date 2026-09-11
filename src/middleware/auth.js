// Admin authentication: cookie-session + bcrypt.
const bcrypt = require('bcryptjs');
const User = require('../models/User');

function requireAdmin(req, res, next) {
  if (req.session?.userId) return next();
  if (req.originalUrl.startsWith('/api/')) return res.status(401).json({ success: false, message: 'Not signed in', error: 'UNAUTHENTICATED' });
  return res.redirect('/admin/login');
}

function login(req, res) {
  const { username = '', password = '' } = req.body || {};
  const user = User.byUsername(String(username).trim());
  if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
    return res.status(401).json({ success: false, message: 'Wrong username or password.', error: 'INVALID_CREDENTIALS' });
  }
  req.session.userId = user.id;
  req.session.username = user.username;
  res.json({ ok: true, username: user.username });
}

function logout(req, res) {
  req.session = null;
  res.json({ ok: true });
}

module.exports = { requireAdmin, login, logout };
