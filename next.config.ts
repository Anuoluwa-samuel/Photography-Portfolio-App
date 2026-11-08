import type { NextConfig } from 'next';
import { createRequire } from 'node:module';

// Shared with the Express app (src/app.js) so the two header sets cannot drift.
const require_ = createRequire(import.meta.url);
const { nextHeaders } = require_('./src/config/securityHeaders') as {
  nextHeaders: (dev: boolean) => { key: string; value: string }[];
};

const nextConfig: NextConfig = {
  // Both ship native binaries (.node), which cannot be bundled into a server chunk. The App Router
  // bundles node_modules by default, so without this the pages 500 at runtime.
  serverExternalPackages: ['sharp', '@libsql/client'],
  poweredByHeader: false,
  reactStrictMode: true,

  // Dev only: let phones/tablets on the LAN load /_next/* while testing responsive layouts.
  // Without this Next blocks the chunks cross-origin, React never hydrates and the curtain never lifts.
  allowedDevOrigins: ['172.20.10.*', '192.168.*.*', '10.*.*.*'],

  // Express/helmet only covers the routes Express answers. The public pages are rendered by Next,
  // so without this they would ship with no CSP, no X-Frame-Options and no nosniff.
  async headers() {
    return [{ source: '/:path*', headers: nextHeaders(process.env.NODE_ENV !== 'production') }];
  },
};

export default nextConfig;
