// One definition of the security headers, used by both request paths.
//
// Express (helmet) only sees /api/* and the rewritten admin/SEO routes. On Vercel the public pages
// are rendered by Next without ever entering the Express app, so Next must emit the same headers
// itself via next.config.ts. Keeping the directives here means the two cannot drift apart.

/** CSP directives in helmet's shape. */
function cspDirectives(dev) {
  return {
    defaultSrc: ["'self'"],
    // Next.js streams page data through inline scripts; dev mode also needs eval for React's debug tooling.
    scriptSrc: ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : [])],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
    // unsplash = placeholder photos (remove once you upload your own);
    // *.public.blob.vercel-storage.com = uploads once BLOB_READ_WRITE_TOKEN is set.
    imgSrc: ["'self'", 'data:', 'blob:', 'https://images.unsplash.com', 'https://*.public.blob.vercel-storage.com'],
    connectSrc: ["'self'", ...(dev ? ['ws:', 'wss:'] : [])],             // dev: hot reload websocket
    frameAncestors: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    objectSrc: ["'none'"],
    ...(dev ? {} : { upgradeInsecureRequests: [] }),
  };
}

const kebab = (s) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** The same directives serialised for a raw Content-Security-Policy header. */
function cspString(dev) {
  return Object.entries(cspDirectives(dev))
    .map(([name, values]) => (values.length ? `${kebab(name)} ${values.join(' ')}` : kebab(name)))
    .join('; ');
}

/** Headers Next must set on the pages it renders, matching what helmet sets on Express routes. */
function nextHeaders(dev) {
  return [
    { key: 'Content-Security-Policy', value: cspString(dev) },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    { key: 'Referrer-Policy', value: 'no-referrer' },
    { key: 'X-DNS-Prefetch-Control', value: 'off' },
    ...(dev ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=15552000; includeSubDomains' }]),
  ];
}

module.exports = { cspDirectives, cspString, nextHeaders };
