const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { login, logout } = require('../middleware/auth');

function me(req, res) {
  if (!req.session?.userId) return res.status(401).json({ success: false, message: 'Not signed in', error: 'UNAUTHENTICATED' });
  res.json({ username: req.session.username });
}

async function changePassword(req, res) {
  const { current = '', next = '' } = req.body || {};
  const user = await User.byUsername(req.session.username);
  if (!bcrypt.compareSync(String(current), user.password_hash)) return res.status(400).json({ success: false, message: 'Current password is wrong.', error: 'WRONG_PASSWORD' });
  if (String(next).length < 8) return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.', error: 'VALIDATION_ERROR' });
  await User.setPassword(user.id, String(next));
  res.json({ ok: true });
}

module.exports = { login, logout, me, changePassword };
