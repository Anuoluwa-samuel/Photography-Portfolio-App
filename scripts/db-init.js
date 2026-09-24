// Create the schema, seed first-run data and apply one-time migrations.
// Run once per environment (local, preview, production):
//   npm run db:init
// Safe to re-run — every step is guarded — but never run it concurrently.
require('dotenv').config();
const { init } = require('../src/config/database');

init()
  .then(({ url }) => {
    const target = url.startsWith('file:') ? url.replace('file:', '') : url.replace(/\?.*$/, '');
    console.log(`\n  Database ready: ${target}\n`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n  Database init failed:\n', err);
    process.exit(1);
  });
