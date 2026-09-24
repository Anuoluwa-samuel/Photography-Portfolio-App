import type { NextConfig } from 'next';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

// Shared with the Express app (src/app.js) so the two header sets cannot drift.
const require_ = createRequire(import.meta.url);
const { nextHeaders } = require_('./src/config/securityHeaders') as {
  nextHeaders: (dev: boolean) => { key: string; value: string }[];
};

// Non-/api paths that the Express app owns. Next rewrites them onto the catch-all API route, which
// strips the prefix and restores the original path before handing the request to Express.
// Everything under src/ is reached from the page components through createRequire (see lib/data.ts),
// which Next's file tracer cannot follow into node_modules. It traces the src/*.js files themselves
// but none of their packages, so the page functions deploy without them and 500 at runtime —
// first on @libsql/client, then js-base64, then bcryptjs, one redeploy at a time.
//
// Rather than hand-listing packages and rediscovering the next omission on the next deploy, walk
// the dependency tree at build time from the handful src/ requires directly. Transitive changes
// are picked up automatically; only a brand-new direct import needs adding to SRC_EXTERNALS.
const SRC_EXTERNALS = [
  '@libsql/client', '@vercel/blob', 'bcryptjs', 'cookie-session',
  'express', 'express-rate-limit', 'helmet', 'multer', 'nodemailer', 'sharp',
];

function runtimeClosure(roots: string[]): string[] {
  const seen = new Set<string>();
  const found = new Set<string>();
  const visit = (name: string) => {
    if (seen.has(name)) return;
    seen.add(name);
    const manifest = path.join(process.cwd(), 'node_modules', name, 'package.json');
    if (!fs.existsSync(manifest)) return;           // optional per-platform builds, absent here
    found.add(name);
    const pkg = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    Object.keys(pkg.dependencies ?? {}).forEach(visit);
    Object.keys(pkg.optionalDependencies ?? {}).forEach(visit);
  };
  roots.forEach(visit);
  return [...found].sort().map(name => `./node_modules/${name}/**`);
}

const SRC_RUNTIME = runtimeClosure(SRC_EXTERNALS);

const EXPRESS_PATHS = ['/admin', '/admin/:path*', '/robots.txt', '/sitemap.xml', '/healthz'];

const nextConfig: NextConfig = {
  // Both ship native binaries (.node), which cannot be bundled into a server chunk. The App Router
  // bundles node_modules by default, so without this the pages 500 at runtime while the Pages-Router
  // API route — which traces its dependencies instead — keeps working. That asymmetry is exactly how
  // this first showed up on Vercel: /api/* served fine and / did not.
  serverExternalPackages: ['sharp', '@libsql/client'],
  poweredByHeader: false,
  reactStrictMode: true,

  // Dev only: let phones/tablets on the LAN load /_next/* while testing responsive layouts.
  // Without this Next blocks the chunks cross-origin, React never hydrates and the curtain never lifts.
  allowedDevOrigins: ['172.20.10.*', '192.168.*.*', '10.*.*.*'],

  // The admin pages are static HTML read from disk at request time (and their CSS/JS is hashed for
  // cache-busting). Vercel serves public/ from the CDN and does not put it in the function bundle,
  // so trace these files in explicitly or versionedHtml() throws ENOENT on every /admin request.
  outputFileTracingIncludes: {
    // admin-pages/ holds the HTML; public/admin/** is still needed so versionedHtml can hash the CSS/JS.
    '/api/[[...path]]': ['./admin-pages/**', './public/admin/**'],
    // lib/data.ts reaches the CommonJS models through createRequire at runtime, so the tracer
    // follows src/** but never sees the require('@libsql/client') inside src/config/database.js.
    // Without these the page functions deploy without the driver and 500 with MODULE_NOT_FOUND,
    // while /api/* — traced normally through pages/api — keeps working.
    // The whole runtime closure, not just the @libsql scope: js-base64, promise-limit, ws,
    // detect-libc and @neon-rs/load are siblings at the top level of node_modules, and a glob
    // over @libsql/** silently misses them. The first attempt did exactly that and the pages
    // still 500'd, on "Cannot find module 'js-base64'".
    '/': SRC_RUNTIME,
    '/projects/[slug]': SRC_RUNTIME,
  },

  // Express/helmet only sees /api/* and the rewritten routes. On Vercel the pages below are rendered
  // by Next directly, so without this they would ship with no CSP, no X-Frame-Options and no nosniff.
  async headers() {
    return [{ source: '/:path*', headers: nextHeaders(process.env.NODE_ENV !== 'production') }];
  },

  async rewrites() {
    return EXPRESS_PATHS.map(source => ({
      source,
      destination: source === '/admin' ? '/api/__x/admin' : `/api/__x${source}`,
    }));
  },
};

export default nextConfig;
