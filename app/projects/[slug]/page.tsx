import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { absolute, getProjectData, siteUrlFrom } from '@/lib/data';
import { brandIcon } from '@/lib/site';
import { IconSprite, Icon } from '@/components/icons/sprite';
import { ActionButton } from '@/components/ui/action-button';
import { Curtain, Reveal } from '@/components/site/motion';
import { SiteNav } from '@/components/site/site-nav';
import { BookingProvider } from '@/components/site/booking-provider';
import { SiteFooter } from '@/components/site/site-footer';
import { ProjectGallery } from '@/components/site/project-gallery';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

async function siteUrl() {
  const h = await headers();
  return siteUrlFrom(h.get('x-forwarded-host') ?? h.get('host'), h.get('x-forwarded-proto'));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = getProjectData((await params).slug);
  if (!data) return {};
  const { s, project } = data;
  const url = await siteUrl();
  const title = `${project.title} — ${s.site_name}`;
  const description = project.description ? project.description.slice(0, 200) : s.seo_description;
  return {
    title,
    description,
    alternates: { canonical: `${url}/projects/${project.slug}` },
    icons: { icon: brandIcon(s.brand_name) },
    openGraph: {
      type: 'article', siteName: s.site_name, title, description, url: `${url}/projects/${project.slug}`,
      ...(project.cover_image ? { images: [absolute(project.cover_image, url)] } : {}),
    },
    twitter: { card: 'summary_large_image' },
  };
}

export default async function ProjectPage({ params }: Props) {
  const data = getProjectData((await params).slug);
  if (!data) notFound();
  const { s, socials, project, images, year, services } = data;

  const meta = [
    project.category_label && { icon: 'frame', text: project.category_label },
    project.location && { icon: 'pin', text: project.location },
    project.date && {
      icon: 'calendar',
      text: new Date(project.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    },
  ].filter((m): m is { icon: string; text: string } => !!m);

  return (
    <BookingProvider services={services.map(sv => sv.name)} title={s.contact_title} intro={s.contact_intro}>
      <a className="skip" href="#main">Skip to content</a>
      <Curtain brand={s.brand_name} />
      <IconSprite />

      <SiteNav brandName={s.brand_name} brandTagline={s.brand_tagline} siteName={s.site_name} activeId="portfolio" />

      <main id="main">
        <section id="project" aria-labelledby="project-title" className="section !pt-0">
          <div className="pb-2 pt-[calc(var(--nav-h)+64px)]">
            <div className="site-container">
              <Reveal className="section-head">
                <div>
                  <p className="eyebrow">
                    <ActionButton
                      href="/#portfolio"
                      variant="link"
                      size="sm"
                      arrow={false}
                      icon={<ArrowLeft aria-hidden="true" className="transition-transform duration-300 group-hover/action:-translate-x-1" />}
                    >
                      Back to portfolio
                    </ActionButton>
                  </p>
                  <h1 className="display mt-5" id="project-title">{project.title}</h1>
                </div>
                {project.description && <p className="lead">{project.description}</p>}
              </Reveal>

              {meta.length > 0 && (
                <Reveal delay={0.05} className="mt-8 flex flex-wrap gap-x-8 gap-y-4 text-[.85rem] text-muted-foreground">
                  {meta.map(m => (
                    <span key={m.icon} className="flex items-center gap-2">
                      <Icon name={m.icon} className="size-4 flex-none stroke-[1.6] text-brand" />{m.text}
                    </span>
                  ))}
                </Reveal>
              )}
            </div>
          </div>

          <div className="site-container">
            {images.length ? (
              <ProjectGallery
                items={images.map(img => ({
                  id: img.id, title: img.caption || project.title, alt: img.alt || project.title, caption: img.caption,
                  full: img.src_full, thumb: img.src_thumb, width: img.width, height: img.height,
                }))}
              />
            ) : (
              <p className="lead mt-14 text-dim">No photos have been added to this project yet.</p>
            )}
          </div>
        </section>
      </main>

      <SiteFooter s={s} socials={socials} year={year} />
    </BookingProvider>
  );
}
