// Vercel entry point for everything Express owns.
//
// Next.js routes the pages; this catch-all hands /api/* — plus the paths rewritten onto it in
// next.config.ts (/admin, /robots.txt, /sitemap.xml, /uploads/*) — to the same Express app that
// server.js uses locally. Keeping one app means auth, CSP and the 37 endpoints have a single
// definition rather than a serverless copy that can drift.
const { createApp } = require('../../src/app');

// Built once per instance and reused across warm invocations.
const app = createApp((req, res) => {
  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ success: false, message: 'Not found', error: 'NOT_FOUND' }));
});

export const config = {
  api: {
    // Express owns body parsing: express.json/urlencoded for the API, multer for uploads.
    // Next's parser would consume the stream first and multer would see an empty request.
    bodyParser: false,
    responseLimit: false,
  },
};

// Requests rewritten from a non-/api path arrive as /api/__x/<original>; put the original back so
// the Express routes (which are declared on the real paths) match.
const PREFIX = '/api/__x';

export default function handler(req, res) {
  if (req.url.startsWith(PREFIX)) req.url = req.url.slice(PREFIX.length) || '/';
  return app(req, res);
}
