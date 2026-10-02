const Project = require('../models/Project');
const Category = require('../models/Category');
const Service = require('../models/Service');
const env = require('../config/environment');
const Settings = require('../models/Settings');
const imageService = require('../services/imageService');

function siteUrlFor(req) { return env.SITE_URL || `${req.protocol}://${req.get('host')}`; }

/* ---------- Read-only JSON ---------- */
async function apiProjects(req, res) {
  const projects = await Project.all({ publishedOnly: true });
  res.json(projects.map(p => ({
    id: p.id, title: p.title, slug: p.slug, description: p.description,
    category: p.category_slug, location: p.location, date: p.date,
    cover: p.cover_image, featured: !!p.featured, imageCount: p.image_count,
  })));
}
async function apiCategories(req, res) { res.json(await Category.allActive()); }
async function apiServices(req, res) { res.json(await Service.all(true)); }

/* ---------- SEO ---------- */
async function sitemap(req, res) {
  const base = siteUrlFor(req);
  const projects = await Project.all({ publishedOnly: true });
  const urls = ['/', ...projects.map(p => `/projects/${p.slug}`)];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${
    urls.map(u => `  <url><loc>${base}${u}</loc></url>`).join('\n')
  }\n</urlset>`;
  res.type('application/xml').send(body);
}

/* ---------- Social share image ---------- */
// The stored photos are 4:5 WebP, which WhatsApp and Facebook previews handle unreliably. This crops
// the hero (or ?project=<slug>'s cover) to a 1200x630 JPEG. The pages add ?v=<hash of the source URL>,
// so a new photo gets a new URL and the CDN can cache each one for a long time.
async function shareImage(req, res) {
  const slug = typeof req.query.project === 'string' ? req.query.project : '';
  const project = slug ? await Project.bySlug(slug) : null;
  const src = (project?.published && project.cover_image) || await Settings.get('hero_image');
  if (!src) return res.status(404).end();
  try {
    const jpg = await imageService.renderShareImage(await imageService.loadImage(src));
    res.set('Cache-Control', 'public, max-age=86400, s-maxage=31536000, immutable').type('image/jpeg').send(jpg);
  } catch (err) {
    console.error('[og] could not render share image from', src, '-', err.message);
    res.redirect(302, src);
  }
}

module.exports = { apiProjects, apiCategories, apiServices, sitemap, shareImage };
