// Turns a title into a URL-safe slug, e.g. "Tolu & Damilare's Wedding" -> "tolu-damilares-wedding".
function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'project';
}

/** Appends -2, -3, ... until `exists(candidate)` returns false. */
function uniqueSlug(base, exists) {
  const root = slugify(base);
  if (!exists(root)) return root;
  let i = 2;
  while (exists(`${root}-${i}`)) i++;
  return `${root}-${i}`;
}

module.exports = { slugify, uniqueSlug };
