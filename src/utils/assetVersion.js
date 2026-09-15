// Cache-busting for the static admin pages.
// Admin CSS/JS are served with a long cache (express.static maxAge), so after a deploy browsers could keep old files
// for days. Before sending an admin HTML page, every local /admin/*.css|js reference gets `?v=<content hash>`: the URL
// changes exactly when the file does, so no manual version bumps are needed.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ASSET_RE = /(src|href)="(\/admin\/[^"?#]+\.(?:css|js))"/g;
const pageCache = new Map();

function hashFile(file) {
  return crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex').slice(0, 10);
}

/**
 * @param {string} htmlPath  absolute path of the HTML page
 * @param {string} publicDir directory the /admin URLs are served from
 * @param {boolean} cache    true in production (compute once); false in dev (pick up edits on every request)
 */
function versionedHtml(htmlPath, publicDir, cache) {
  if (cache && pageCache.has(htmlPath)) return pageCache.get(htmlPath);
  const html = fs.readFileSync(htmlPath, 'utf8').replace(ASSET_RE, (match, attr, url) => {
    try {
      return `${attr}="${url}?v=${hashFile(path.join(publicDir, url))}"`;
    } catch {
      return match; // missing file: leave the reference untouched
    }
  });
  if (cache) pageCache.set(htmlPath, html);
  return html;
}

module.exports = { versionedHtml };
