const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { login, logout, currentUser, startSession } = require('../middleware/auth');

async function me(req, res) {
  const user = await currentUser(req);
  if (!user) return res.status(401).json({ success: false, message: 'Not signed in', error: 'UNAUTHENTICATED' });
  res.json({ username: user.username });
}

async function changePassword(req, res) {
  const { current = '', next = '' } = req.body || {};
  const user = req.user;
  if (!bcrypt.compareSync(String(current), user.password_hash)) return res.status(400).json({ success: false, message: 'Current password is wrong.', error: 'WRONG_PASSWORD' });
  if (String(next).length < 8) return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.', error: 'VALIDATION_ERROR' });
  await User.setPassword(user.id, String(next));
  // The new hash invalidates every other session; re-stamp this one so it stays signed in.
  startSession(req, await User.byId(user.id));
  res.json({ ok: true });
}

module.exports = { login, logout, me, changePassword };
