// Deletes the database (and uploaded photos) and re-seeds placeholder content:  npm run reset-db
require('dotenv').config();
const fs = require('fs'); const path = require('path');
const dataDir = path.resolve(process.env.DATA_DIR || './data');
const upDir = path.resolve(process.env.UPLOAD_DIR || './public/uploads');
for (const f of ['site.db', 'site.db-wal', 'site.db-shm']) fs.rmSync(path.join(dataDir, f), { force: true });
for (const sub of ['gallery', 'site']) {
  const dir = path.join(upDir, sub);
  if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) if (f !== '.gitkeep') fs.rmSync(path.join(dir, f));
}
require('../src/config/database'); // re-creates and seeds
console.log('Database reset and re-seeded with placeholder content.');
