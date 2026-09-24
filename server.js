// YIT0 SHOT IT — local dev server and any long-lived Node host (Render, Fly, Docker, a VPS).
// Node.js 20.9+ · Express 5 (admin, API, uploads) · Next.js 16 (public site) · libSQL · Sharp · Nodemailer
//
// On Vercel this file is not used: Next owns routing and the same Express app is mounted by
// pages/api/[[...path]].js instead.
if (process.argv.includes('--production')) process.env.NODE_ENV = 'production';
require('dotenv').config();

const http = require('http');
const next = require('next');

const env = require('./src/config/environment');
const { init: initDb } = require('./src/config/database');
const { createApp } = require('./src/app');

const dev = !env.isProd;
const nextApp = next({ dev, dir: __dirname });
const handleNext = nextApp.getRequestHandler();

// Anything Express doesn't answer is a public page — hand it to Next.
const app = createApp((req, res) => handleNext(req, res));
const server = http.createServer(app);

// Local convenience: ensure the schema exists before serving. In production the schema is created
// once by `npm run db:init`, never per boot — concurrent serverless instances would race.
const prepare = env.isProd ? nextApp.prepare() : initDb().then(() => nextApp.prepare());

prepare.then(() => {
  server.listen(env.PORT, () => {
    console.log(`\n  ${env.SITE_NAME} is running (${dev ? 'development' : 'production'})`);
    console.log(`  Site:   http://localhost:${env.PORT}`);
    console.log(`  Admin:  http://localhost:${env.PORT}/admin\n`);
  });
}).catch(err => {
  console.error(err);
  if (!dev) console.error('\n  Did you run `npm run build` first?\n');
  process.exit(1);
});
