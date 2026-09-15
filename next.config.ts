import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Native modules used by the Express side (src/) — never bundle them.
  serverExternalPackages: ['better-sqlite3', 'sharp'],
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
