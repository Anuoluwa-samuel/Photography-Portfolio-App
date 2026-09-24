import type { NextConfig } from 'next';
import { createRequire } from 'node:module';

// Shared with the Express app (src/app.js) so the two header sets cannot drift.
const require_ = createRequire(import.meta.url);
const { nextHeaders } = require_('./src/config/securityHeaders') as {
  nextHeaders: (dev: boolean) => { key: string; value: string }[];
};

// Non-/api paths that the Express app owns. Next rewrites them onto the catch-all API route, which
// strips the prefix and restores the original path before handing the request to Express.
const EXPRESS_PATHS = ['/admin', '/admin/:path*', '/robots.txt', '/sitemap.xml', '/healthz'];

const nextConfig: NextConfig = {
  // sharp ships prebuilt native binaries — never bundle it.
  serverExternalPackages: ['sharp'],
  poweredByHeader: false,
  reactStrictMode: true,

  // Dev only: let phones/tablets on the LAN load /_next/* while testing responsive layouts.
  // Without this Next blocks the chunks cross-origin, React never hydrates and the curtain never lifts.
  allowedDevOrigins: ['172.20.10.*', '192.168.*.*', '10.*.*.*'],

  // The admin pages are static HTML read from disk at request time (and their CSS/JS is hashed for
  // cache-busting). Vercel serves public/ from the CDN and does not put it in the function bundle,
  // so trace these files in explicitly or versionedHtml() throws ENOENT on every /admin request.
  outputFileTracingIncludes: {
    '/api/[[...path]]': ['./public/admin/**'],
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
