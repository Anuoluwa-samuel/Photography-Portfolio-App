const bcrypt = require('bcryptjs');
const { db } = require('../config/database');

module.exports = {
  async byUsername(u) { return db.prepare('SELECT * FROM users WHERE username = ?').get(u); },
  async setPassword(id, password) { return db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(password, 12), id); },
};
