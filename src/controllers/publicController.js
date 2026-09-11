const Settings = require('../models/Settings');
const Project = require('../models/Project');
const Image = require('../models/Image');
const Category = require('../models/Category');
const Service = require('../models/Service');
const { esc, accent, paragraphs, safeJson } = require('../utils/text');
const { SOCIALS } = require('../constants');

function siteUrlFor(req) { return process.env.SITE_URL || `${req.protocol}://${req.get('host')}`; }
function socialsFor(s) { return SOCIALS.map(k => ({ key: k, url: s['social_' + k] })).filter(x => x.url); }

/* ---------- Homepage ---------- */
function home(req, res) {
  const s = Settings.all();
  const categories = Category.allActive();
  res.render('public/index', {
    s, esc, accent, paragraphs,
    siteUrl: siteUrlFor(req),
    categories,
    catLabel: Object.fromEntries(categories.map(c => [c.slug, c.label])),
    socials: socialsFor(s),
    projects: Project.all({ publishedOnly: true }),
    featured: Project.featured(3),
    services: Service.all(true),
    aboutPoints: safeJson(s.about_points, []),
    stats: safeJson(s.stats, []),
    year: new Date().getFullYear(),
  });
}

/* ---------- Project detail ---------- */
function projectDetail(req, res, next) {
  const project = Project.bySlug(req.params.slug);
  if (!project || !project.published) return next();
  const s = Settings.all();
  res.render('public/project', {
    s, esc, accent, paragraphs,
    siteUrl: siteUrlFor(req),
    socials: socialsFor(s),
    project,
    images: Image.forProject(project.id),
    year: new Date().getFullYear(),
  });
}

/* ---------- Read-only JSON ---------- */
function apiProjects(req, res) {
  res.json(Project.all({ publishedOnly: true }).map(p => ({
    id: p.id, title: p.title, slug: p.slug, description: p.description,
    category: p.category_slug, location: p.location, date: p.date,
    cover: p.cover_image, featured: !!p.featured, imageCount: p.image_count,
  })));
}
function apiCategories(req, res) { res.json(Category.allActive()); }
function apiServices(req, res) { res.json(Service.all(true)); }

/* ---------- SEO ---------- */
function sitemap(req, res) {
  const base = siteUrlFor(req);
  const urls = ['/', ...Project.all({ publishedOnly: true }).map(p => `/projects/${p.slug}`)];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${
    urls.map(u => `  <url><loc>${base}${u}</loc></url>`).join('\n')
  }\n</urlset>`;
  res.type('application/xml').send(body);
}

module.exports = { home, projectDetail, apiProjects, apiCategories, apiServices, sitemap };
