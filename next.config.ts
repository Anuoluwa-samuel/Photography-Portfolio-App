import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Native modules used by the Express side (src/) — never bundle them.
  serverExternalPackages: ['better-sqlite3', 'sharp'],
  poweredByHeader: false,
  reactStrictMode: true,
  // Dev only: let phones/tablets on the LAN load /_next/* while testing responsive layouts.
  // Without this Next blocks the chunks cross-origin, React never hydrates and the curtain never lifts.
  allowedDevOrigins: ['172.20.10.*', '192.168.*.*', '10.*.*.*'],
};

export default nextConfig;
