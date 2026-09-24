// Server-only data access for the Next.js pages.
// Reuses the Express app's CommonJS models (src/models) through Node's own require, so both
// sides share one module cache — one SQLite connection, one set of migrations — instead of
// the bundler compiling a second copy of the database layer.
import { createRequire } from 'node:module';
import path from 'node:path';
// A real, statically-analysable import of the database driver. The models below are pulled in
// through createRequire, which Next's file tracer cannot follow into node_modules — so without
// this the page functions deploy without @libsql/client and every page 500s on MODULE_NOT_FOUND.
// @libsql/client is listed in serverExternalPackages, so this is emitted as a require of an
// external package and Next traces the whole dependency closure (js-base64, ws, libsql, …) itself
// rather than us enumerating it by hand in next.config.ts.
import '@libsql/client';

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

// The models are async now (libSQL over the network in production), so every accessor below
// returns a promise and the pages awaiting them are async server components.
const models = () => ({
  Settings: load<{ all(): Promise<Settings> }>('models/Settings'),
  Project: load<{ all(o: { publishedOnly: boolean }): Promise<Project[]>; featured(n: number): Promise<Project[]>; bySlug(s: string): Promise<Project | undefined> }>('models/Project'),
  Image: load<{ forProject(id: number): Promise<ProjectImage[]> }>('models/Image'),
  Category: load<{ allActive(): Promise<Category[]> }>('models/Category'),
  Service: load<{ all(activeOnly: boolean): Promise<Service[]> }>('models/Service'),
  constants: load<{ SOCIALS: string[] }>('constants'),
});

const safeJson = <T,>(str: string | undefined, fallback: T): T => {
  try { return JSON.parse(str ?? '') as T; } catch { return fallback; }
};

export async function getSiteShell() {
  const m = models();
  const s = await m.Settings.all();
  const socials = m.constants.SOCIALS.map(key => ({ key, url: s['social_' + key] })).filter((x): x is Social => !!x.url);
  return { s, socials, year: new Date().getFullYear() };
}

export async function getHomeData() {
  const m = models();
  // Independent queries — one network round-trip each against Turso, so run them concurrently.
  const [shell, categories, projects, featured, services] = await Promise.all([
    getSiteShell(),
    m.Category.allActive(),
    m.Project.all({ publishedOnly: true }),
    m.Project.featured(3),
    m.Service.all(true),
  ]);
  return {
    ...shell,
    categories,
    projects,
    featured,
    services,
    aboutPoints: safeJson<AboutPoint[]>(shell.s.about_points, []),
    stats: safeJson<Stat[]>(shell.s.stats, []),
  };
}

export async function getProjectData(slug: string) {
  const m = models();
  const project = await m.Project.bySlug(slug);
  if (!project || !project.published) return null;
  const [shell, images, services] = await Promise.all([
    getSiteShell(),
    m.Image.forProject(project.id),
    m.Service.all(true),
  ]);
  return { ...shell, project, images, services };
}

/** Absolute site URL for canonical / Open Graph tags. */
export function siteUrlFrom(host: string | null, proto: string | null) {
  return process.env.SITE_URL || `${proto || 'http'}://${host || 'localhost:3000'}`;
}

export const absolute = (url: string, siteUrl: string) => (url.startsWith('http') ? url : siteUrl + url);
