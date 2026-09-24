const Project = require('../models/Project');
const Category = require('../models/Category');
const Service = require('../models/Service');

function siteUrlFor(req) { return process.env.SITE_URL || `${req.protocol}://${req.get('host')}`; }

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

module.exports = { apiProjects, apiCategories, apiServices, sitemap };
