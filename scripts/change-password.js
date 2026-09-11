// Reset the admin password from the command line:  npm run change-password
require('dotenv').config();
const readline = require('readline');
const users = require('../src/models/User');
const { db } = require('../src/config/database');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = q => new Promise(r => rl.question(q, r));
(async () => {
  const username = (await ask(`Username [${process.env.ADMIN_USERNAME || 'admin'}]: `)).trim() || process.env.ADMIN_USERNAME || 'admin';
  const user = users.byUsername(username);
  if (!user) { console.error(`No user "${username}".`); process.exit(1); }
  const pw = await ask('New password (min 8 chars): ');
  if (pw.length < 8) { console.error('Too short.'); process.exit(1); }
  users.setPassword(user.id, pw);
  console.log(`Password updated for "${username}".`);
  rl.close(); db.close();
})();
