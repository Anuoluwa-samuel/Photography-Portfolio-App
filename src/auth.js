// Admin authentication: cookie-session + bcrypt.
const bcrypt = require('bcryptjs');
const { users } = require('./db');

function requireAdmin(req, res, next) {
  if (req.session?.userId) return next();
  if (req.originalUrl.startsWith('/api/')) return res.status(401).json({ error: 'Not signed in' });
  return res.redirect('/admin/login');
}

function login(req, res) {
  const { username = '', password = '' } = req.body || {};
  const user = users.byUsername(String(username).trim());
  if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
    return res.status(401).json({ error: 'Wrong username or password.' });
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
