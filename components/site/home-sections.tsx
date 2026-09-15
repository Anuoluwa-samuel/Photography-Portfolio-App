import type { AboutPoint, Category, Project, Service, Settings, Social, Stat } from '@/lib/data';
import { Accent, paragraphs, telHref } from '@/lib/text';
import { cn, cssVars } from '@/lib/utils';
import { Icon } from '@/components/icons/sprite';
import { ActionButton } from '@/components/ui/action-button';
import { GlassCard } from '@/components/ui/glass-card';
import { CountUp, HeroParallax, Reveal, SmartImage } from '@/components/site/motion';
import { FeaturedReel } from '@/components/site/featured-reel';
import { PortfolioCarousel } from '@/components/site/portfolio-carousel';
import { BookServiceLink, EnquiryPanel } from '@/components/site/enquiry-form';
import { SocialLinks } from '@/components/site/social-links';

function SectionHead({ eyebrow, title, titleId, intro }: { eyebrow: string; title: string; titleId: string; intro: string }) {
  return (
    <Reveal className="section-head">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="display" id={titleId}><Accent text={title} /></h2>
      </div>
      <p className="lead">{intro}</p>
    </Reveal>
  );
}

/* ================= HERO ================= */
export function Hero({ s, socials, letter }: { s: Settings; socials: Social[]; letter: string }) {
  return (
    <section id="hero" aria-labelledby="hero-title" className="section grid min-h-screen items-center overflow-hidden !pb-20 !pt-[calc(var(--nav-h)+64px)] max-[900px]:min-h-0 max-[900px]:!pb-[64px]">
      <div className="wm" aria-hidden="true">{letter}</div>
      <div className="site-container grid grid-cols-[1.05fr_.95fr] items-center gap-[64px] max-[900px]:grid-cols-1 max-[900px]:gap-12">
        <div>
          <p className="eyebrow intro" style={cssVars({ '--i': 0 })}>{s.hero_eyebrow}</p>
          <h1 className="display intro text-[clamp(2.7rem,6.6vw,5.6rem)]" id="hero-title" style={cssVars({ '--i': 1 })}><Accent text={s.hero_title} /></h1>
          <div className="rule intro" style={cssVars({ '--i': 2 })} />
          <p className="lead intro" style={cssVars({ '--i': 3 })}>{s.hero_intro}</p>
          <div className="intro mt-10 flex flex-wrap gap-4 max-[600px]:[&>a]:flex-auto" style={cssVars({ '--i': 4 })}>
            <ActionButton href="#portfolio">View portfolio</ActionButton>
            <ActionButton href="#contact" variant="glass" arrow={false} data-book="">Book a session</ActionButton>
          </div>
          {socials.length > 0 && (
            <div className="intro mt-12 flex items-center gap-[16px] font-display text-[.72rem] uppercase tracking-[.2em] text-dim before:h-px before:w-10 before:bg-dim before:content-['']" style={cssVars({ '--i': 5 })}>
              <span>Follow</span>
              <SocialLinks socials={socials.slice(0, 3)} />
            </div>
          )}
        </div>

        <HeroParallax className="relative w-[min(100%,432px)] justify-self-end max-[900px]:w-[min(100%,384px)] max-[900px]:justify-self-start">
          <div className="intro intro-media relative" style={cssVars({ '--i': 2 })}>
            <div aria-hidden="true" className="absolute -inset-x-[18%] -inset-y-[12%] z-0 bg-[radial-gradient(closest-side,var(--spill),transparent_70%)] blur-[30px]" />
            <div className="hero-frame">
              <SmartImage src={s.hero_image} width={900} height={1125} fetchPriority="high" alt={s.hero_image_alt} className="size-full object-cover saturate-[.85] contrast-[1.06]" />
              <div aria-hidden="true" className="hero-frame-light" />
              <div aria-hidden="true" className="absolute inset-0 z-[2] bg-linear-to-t from-black/55 to-transparent to-40%" />
              <div className="glass absolute bottom-[24px] left-[24px] z-[3] rounded-xl px-4 py-3 font-display text-[.7rem] uppercase leading-snug tracking-[.2em] text-foreground">
                {s.hero_tag}<span className="mt-0.5 block text-brand">{s.hero_tag_sub}</span>
              </div>
            </div>
          </div>
        </HeroParallax>
      </div>
    </section>
  );
}

/* ================= FEATURED ================= */
export function Featured({ s, featured }: { s: Settings; featured: Project[] }) {
  if (!featured.length) return null;
  return (
    <section aria-labelledby="featured-title" className="section !pt-0">
      <div className="site-container">
        <SectionHead eyebrow="Featured" title={s.featured_title} titleId="featured-title" intro={s.featured_intro} />
        <FeaturedReel
          projects={featured.map(p => ({ id: p.id, slug: p.slug, title: p.title, cover: p.cover_image, categoryLabel: p.category_label }))}
        />
      </div>
    </section>
  );
}

/* ================= ABOUT ================= */
export function About({ s, aboutPoints, stats, letter }: { s: Settings; aboutPoints: AboutPoint[]; stats: Stat[]; letter: string }) {
  return (
    <section id="about" aria-labelledby="about-title" className="section">
      <div className="wm right" aria-hidden="true">{letter}</div>
      <div className="site-container">
        <div className="grid grid-cols-[.9fr_1.1fr] items-center gap-[72px] max-[900px]:grid-cols-1 max-[900px]:gap-[48px]">
          <Reveal variant="img" className="relative max-[900px]:max-w-[440px]">
            <div aria-hidden="true" className="absolute -inset-x-[10%] bottom-[-5%] top-[10%] z-0 bg-[radial-gradient(closest-side,var(--spill),transparent_70%)] blur-[40px]" />
            <div className="group/frame relative z-[1] aspect-[4/5] overflow-hidden rounded-[32px] bg-card">
              <SmartImage src={s.about_image} width={800} height={1000} loading="lazy" alt={s.about_image_alt} className="size-full object-cover grayscale contrast-[1.1] transition-[filter] duration-1000 ease-[var(--ease)] group-hover/frame:grayscale-[.2] group-hover/frame:contrast-[1.05]" />
              <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-black/85 to-transparent to-55%" />
              {s.about_quote && (
                <p className="absolute inset-x-[24px] bottom-[24px] z-[2] font-display text-[1.05rem] font-light leading-[1.45] text-white">
                  <span className="mr-1 align-[-.3em] text-[2.4rem] leading-none text-brand-bright">“</span>{s.about_quote}
                </p>
              )}
            </div>
          </Reveal>

          <div>
            <Reveal><p className="eyebrow">About</p></Reveal>
            <Reveal delay={0.05}><h2 className="display" id="about-title"><Accent text={s.about_title} /></h2></Reveal>
            <Reveal delay={0.1}><div className="rule" /></Reveal>
            <Reveal delay={0.15} className="[&_p+p]:mt-4">
              {paragraphs(s.about_bio).map((p, i) => <p key={i} className="lead">{p}</p>)}
            </Reveal>
            {aboutPoints.length > 0 && (
              <div className="mt-[40px] grid grid-cols-2 gap-x-[32px] gap-y-[24px] max-[600px]:grid-cols-1">
                {aboutPoints.map((p, i) => (
                  <Reveal key={i} delay={0.1 + Math.min(i, 5) * 0.06} className="grid grid-cols-[auto_1fr] items-start gap-4">
                    <Icon name={p.icon} className="mt-0.5 size-[32px] stroke-[1.5] text-brand" />
                    <div>
                      <h3 className="mb-2 text-base">{p.title}</h3>
                      <p className="text-[.9rem] text-muted-foreground">{p.text}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </div>

        {stats.length > 0 && (
          <Reveal className="mt-[clamp(72px,8vw,112px)] grid grid-cols-4 gap-[32px] border-t border-border pt-[clamp(48px,6vw,72px)] text-center max-[900px]:grid-cols-2 max-[900px]:gap-x-5 max-[900px]:gap-y-10">
            {stats.map((st, i) => (
              <div key={i}>
                <Icon name={st.icon} className="mx-auto mb-4 size-[48px] stroke-[1.3] text-brand" />
                <div className="font-display text-[.74rem] uppercase tracking-[.18em]">{st.label}</div>
                <CountUp value={Number(st.value) || 0} suffix={st.suffix} className="mt-2 font-display text-[clamp(2.3rem,4.6vw,3.6rem)] font-light leading-[1.1] text-brand tabular-nums" />
              </div>
            ))}
          </Reveal>
        )}
      </div>
    </section>
  );
}

/* ================= PORTFOLIO ================= */
export function Portfolio({ s, projects, categories, letter }: { s: Settings; projects: Project[]; categories: Category[]; letter: string }) {
  const used = new Set(projects.map(p => p.category_slug).filter(Boolean));
  return (
    <section id="portfolio" aria-labelledby="portfolio-title" className="section">
      <div className="wm left" aria-hidden="true">{letter}</div>
      <div className="site-container">
        <SectionHead eyebrow="Portfolio" title={s.portfolio_title} titleId="portfolio-title" intro={s.portfolio_intro} />
        <PortfolioCarousel
          categories={categories.filter(c => used.has(c.slug)).map(c => ({ slug: c.slug, label: c.label }))}
          projects={projects.map(p => ({
            id: p.id, slug: p.slug, title: p.title, cover: p.cover_image,
            categorySlug: p.category_slug, categoryLabel: p.category_label,
          }))}
        />
      </div>
    </section>
  );
}

/* ================= SERVICES ================= */
export function Services({ s, services, letter }: { s: Settings; services: Service[]; letter: string }) {
  return (
    <section id="services" aria-labelledby="services-title" className="section">
      <div className="wm right" aria-hidden="true">{letter}</div>
      <div className="site-container">
        <SectionHead eyebrow="Services" title={s.services_title} titleId="services-title" intro={s.services_intro} />
        <div className="mt-[64px] grid grid-cols-3 gap-5 max-[1080px]:grid-cols-2 max-[600px]:grid-cols-1">
          {services.map((sv, i) => (
            <Reveal key={sv.id} variant="fade" delay={Math.min(i, 5) * 0.07} className="min-[1000px]:[&:nth-child(3n+2)]:translate-y-[32px]">
              <GlassCard
                as="article"
                className="group/svc flex h-full flex-col gap-4 px-[32px] pb-[32px] pt-10 transition-[transform,border-color,box-shadow] duration-500 ease-[var(--ease)] hover:-translate-y-2 hover:border-brand/40 hover:shadow-[0_34px_60px_-34px_var(--brand-glow)]"
              >
                <div aria-hidden="true" className="!absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(31,209,193,.16),transparent_55%)] opacity-0 transition-opacity duration-500 group-hover/svc:opacity-100" />
                <Icon name={sv.icon} className="size-[48px] stroke-[1.3] text-brand" />
                <h3 className="mt-1 text-[1.3rem] leading-[1.2]">{sv.name}</h3>
                {sv.price && <p className="font-display text-[.72rem] uppercase tracking-[.18em] text-brand">{sv.price}</p>}
                <p className="text-[.93rem] text-muted-foreground">{sv.description}</p>
                {sv.includes.length > 0 && (
                  <ul className="mt-0.5 grid gap-2 text-[.87rem] text-muted-foreground">
                    {sv.includes.map((x, j) => (
                      <li key={j} className="relative pl-[16px] before:absolute before:left-0 before:top-[.75em] before:h-[1.5px] before:w-2 before:bg-brand before:content-['']">{x}</li>
                    ))}
                  </ul>
                )}
                <BookServiceLink service={sv.name} className="mt-auto self-start pt-4">{sv.cta}</BookServiceLink>
              </GlassCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================= TESTIMONIAL ================= */
export function Testimonial({ s }: { s: Settings }) {
  if (!s.testimonial_text) return null;
  return (
    <section aria-label="Client testimonial" className="section !pt-0">
      <div className="site-container">
        <Reveal>
          <blockquote className="mx-auto max-w-[824px] text-center font-display text-[clamp(1.4rem,3vw,2.2rem)] font-light leading-[1.35]">
            <span aria-hidden="true" className="mb-[16px] block text-[4rem] leading-[.6] text-brand">“</span>
            {s.testimonial_text}
            <cite className="mt-[24px] block font-sans text-[.8rem] not-italic uppercase tracking-[.2em] text-muted-foreground">
              <b className="font-medium text-brand">{s.testimonial_name}</b>{s.testimonial_meta && <> — {s.testimonial_meta}</>}
            </cite>
          </blockquote>
        </Reveal>
      </div>
    </section>
  );
}

/* ================= CONTACT ================= */
export function Contact({ s, socials, services, letter }: { s: Settings; socials: Social[]; services: Service[]; letter: string }) {
  const value = 'mt-1 block text-[1.05rem] text-foreground transition-colors duration-300';
  const items = [
    { icon: 'mail', label: 'Email', node: <a href={`mailto:${s.email}`} className={cn(value, 'hover:text-brand')}>{s.email}</a> },
    { icon: 'phone', label: 'Phone / WhatsApp', node: <a href={telHref(s.phone)} className={cn(value, 'hover:text-brand')}>{s.phone}</a> },
    { icon: 'pin', label: 'Based in', node: <span className={value}>{s.location}</span> },
    ...(s.hours ? [{ icon: 'clock', label: 'Studio hours', node: <span className={value}>{s.hours}</span> }] : []),
  ];

  return (
    <section id="contact" aria-labelledby="contact-title" className="section">
      <div className="wm left" aria-hidden="true">{letter}</div>
      <div className="site-container">
        <SectionHead eyebrow="Contact" title={s.contact_title} titleId="contact-title" intro={s.contact_intro} />
        <div className="mt-14 grid grid-cols-[.85fr_1.15fr] items-start gap-[64px] max-[900px]:grid-cols-1 max-[900px]:gap-12">
          <div>
            <ul className="mt-2 grid gap-[24px]">
              {items.map(it => (
                <li key={it.label} className="flex items-start gap-4">
                  <Icon name={it.icon} className="mt-1 size-[24px] flex-none stroke-[1.5] text-brand" />
                  <div>
                    <h3 className="text-[.72rem] font-medium uppercase tracking-[.2em] text-muted-foreground">{it.label}</h3>
                    {it.node}
                  </div>
                </li>
              ))}
            </ul>
            <SocialLinks socials={socials} className="mt-10" />
          </div>
          <EnquiryPanel services={services.map(sv => sv.name)} />
        </div>
      </div>
    </section>
  );
}
