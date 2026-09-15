// Server-only data access for the Next.js pages.
// Reuses the Express app's CommonJS models (src/models) through Node's own require, so both
// sides share one module cache — one SQLite connection, one set of migrations — instead of
// the bundler compiling a second copy of the database layer.
import { createRequire } from 'node:module';
import path from 'node:path';

export type Settings = Record<string, string>;

export interface Category { id: number; slug: string; label: string; active: number; sort: number }

export interface Project {
  id: number; title: string; slug: string; description: string;
  category_id: number | null; category_slug: string | null; category_label: string | null;
  location: string; date: string; cover_image: string;
  featured: number; published: number; image_count: number;
}

export interface ProjectImage {
  id: number; project_id: number; src_full: string; src_thumb: string;
  width: number; height: number; caption: string; alt: string;
}

export interface Service {
  id: number; name: string; icon: string; price: string; description: string;
  includes: string[]; cta: string; active: number;
}

export interface Social { key: string; url: string }
export interface AboutPoint { icon: string; title: string; text: string }
export interface Stat { icon: string; label: string; value: number; suffix: string }

const root = process.cwd();
const nodeRequire = createRequire(path.join(root, 'server.js'));
const load = <T,>(file: string): T => nodeRequire(path.join(root, 'src', file)) as T;

const models = () => ({
  Settings: load<{ all(): Settings }>('models/Settings'),
  Project: load<{ all(o: { publishedOnly: boolean }): Project[]; featured(n: number): Project[]; bySlug(s: string): Project | undefined }>('models/Project'),
  Image: load<{ forProject(id: number): ProjectImage[] }>('models/Image'),
  Category: load<{ allActive(): Category[] }>('models/Category'),
  Service: load<{ all(activeOnly: boolean): Service[] }>('models/Service'),
  constants: load<{ SOCIALS: string[] }>('constants'),
});

const safeJson = <T,>(str: string | undefined, fallback: T): T => {
  try { return JSON.parse(str ?? '') as T; } catch { return fallback; }
};

export function getSiteShell() {
  const m = models();
  const s = m.Settings.all();
  const socials = m.constants.SOCIALS.map(key => ({ key, url: s['social_' + key] })).filter((x): x is Social => !!x.url);
  return { s, socials, year: new Date().getFullYear() };
}

export function getHomeData() {
  const m = models();
  const shell = getSiteShell();
  return {
    ...shell,
    categories: m.Category.allActive(),
    projects: m.Project.all({ publishedOnly: true }),
    featured: m.Project.featured(3),
    services: m.Service.all(true),
    aboutPoints: safeJson<AboutPoint[]>(shell.s.about_points, []),
    stats: safeJson<Stat[]>(shell.s.stats, []),
  };
}

export function getProjectData(slug: string) {
  const m = models();
  const project = m.Project.bySlug(slug);
  if (!project || !project.published) return null;
  return { ...getSiteShell(), project, images: m.Image.forProject(project.id), services: m.Service.all(true) };
}

/** Absolute site URL for canonical / Open Graph tags. */
export function siteUrlFrom(host: string | null, proto: string | null) {
  return process.env.SITE_URL || `${proto || 'http'}://${host || 'localhost:3000'}`;
}

export const absolute = (url: string, siteUrl: string) => (url.startsWith('http') ? url : siteUrl + url);
