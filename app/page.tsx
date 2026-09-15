import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { absolute, getHomeData, getSiteShell, siteUrlFrom } from '@/lib/data';
import { brandIcon } from '@/lib/site';
import { IconSprite } from '@/components/icons/sprite';
import { Curtain } from '@/components/site/motion';
import { SiteNav } from '@/components/site/site-nav';
import { BookingProvider } from '@/components/site/booking-provider';
import { SiteFooter } from '@/components/site/site-footer';
import { About, Contact, Featured, Hero, Portfolio, Services, Testimonial } from '@/components/site/home-sections';

export const dynamic = 'force-dynamic'; // content is edited live from the admin CMS

async function siteUrl() {
  const h = await headers();
  return siteUrlFrom(h.get('x-forwarded-host') ?? h.get('host'), h.get('x-forwarded-proto'));
}

export async function generateMetadata(): Promise<Metadata> {
  const { s } = getSiteShell();
  const url = await siteUrl();
  return {
    title: s.seo_title,
    description: s.seo_description,
    keywords: s.seo_keywords,
    alternates: { canonical: `${url}/` },
    icons: { icon: brandIcon(s.brand_name) },
    openGraph: {
      type: 'website', siteName: s.site_name, title: s.seo_title, description: s.seo_description,
      images: [absolute(s.hero_image, url)], url: `${url}/`,
    },
    twitter: { card: 'summary_large_image' },
  };
}

export default async function HomePage() {
  const d = getHomeData();
  const { s, socials } = d;
  const url = await siteUrl();
  const wm = s.brand_name.toUpperCase().replace(/[^A-Z]/g, '') || 'A';
  const letter = (i: number) => wm[i % wm.length];

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'ProfessionalService',
    name: s.site_name, description: s.seo_description, url: `${url}/`,
    image: absolute(s.hero_image, url), telephone: s.phone, email: s.email,
    address: { '@type': 'PostalAddress', addressLocality: s.location_short, addressCountry: 'NG' },
    areaServed: s.location_short, priceRange: '₦₦₦', sameAs: socials.map(x => x.url),
  };

  return (
    <BookingProvider services={d.services.map(sv => sv.name)} title={s.contact_title} intro={s.contact_intro}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <a className="skip" href="#main">Skip to content</a>
      <Curtain brand={s.brand_name} />
      <IconSprite />

      <SiteNav brandName={s.brand_name} brandTagline={s.brand_tagline} siteName={s.site_name} activeId="hero" trackSections />

      <main id="main">
        <Hero s={s} socials={socials} letter={letter(0)} />
        <Featured s={s} featured={d.featured} />
        <About s={s} aboutPoints={d.aboutPoints} stats={d.stats} letter={letter(1)} />
        <Portfolio s={s} projects={d.projects} categories={d.categories} letter={letter(2)} />
        <Services s={s} services={d.services} letter={letter(3)} />
        <Testimonial s={s} />
        <Contact s={s} socials={socials} services={d.services} letter={letter(4)} />
      </main>

      <SiteFooter s={s} socials={socials} year={d.year} watermark={letter(5)} />
    </BookingProvider>
  );
}
