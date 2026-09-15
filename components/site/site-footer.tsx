import type { Settings, Social } from '@/lib/data';
import { NAV_LINKS } from '@/lib/site';
import { telHref } from '@/lib/text';
import { SocialLinks } from '@/components/site/social-links';

export function SiteFooter({ s, socials, year, watermark }: { s: Settings; socials: Social[]; year: number; watermark?: string }) {
  const link = 'text-[.93rem] text-muted-foreground transition-colors duration-300 hover:text-brand';
  const heading = 'mb-5 font-display text-[.72rem] font-medium uppercase tracking-[.22em]';

  return (
    <footer className="relative overflow-hidden border-t border-border pb-[32px] pt-[clamp(64px,7vw,88px)]">
      {watermark && (
        <div className="wm" aria-hidden="true" style={{ top: 'auto', bottom: '-30%', fontSize: 'clamp(10rem,30vw,22rem)' }}>{watermark}</div>
      )}
      <div className="site-container">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1.1fr] gap-12 max-[1080px]:grid-cols-2 max-[600px]:grid-cols-1 max-[600px]:gap-[32px]">
          <div>
            <a href="/#hero" className="flex flex-col leading-none">
              <strong className="font-display text-[1.3rem] font-semibold uppercase tracking-[.16em] text-brand">{s.brand_name}</strong>
              <small className="mt-[4px] pl-0.5 text-[.62rem] tracking-[.14em] text-muted-foreground">{s.brand_tagline}</small>
            </a>
            <p className="mt-4 max-w-[32ch] text-[.95rem] text-muted-foreground">{s.footer_blurb}</p>
          </div>
          <div>
            <h4 className={heading}>Navigate</h4>
            <ul className="grid gap-[12px]">
              {NAV_LINKS.map(l => (
                <li key={l.id}><a href={l.href} data-book={'book' in l ? '' : undefined} className={link}>{l.label}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className={heading}>Contact</h4>
            <ul className="grid gap-[12px]">
              <li><a href={`mailto:${s.email}`} className={link}>{s.email}</a></li>
              <li><a href={telHref(s.phone)} className={link}>{s.phone}</a></li>
              <li><a href="/#contact" className={link}>{s.location_short}</a></li>
            </ul>
          </div>
          <div>
            <h4 className={heading}>Follow</h4>
            <SocialLinks socials={socials} />
          </div>
        </div>
        <div className="mt-[64px] flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6 text-[.78rem] text-dim">
          <span>© {year} {s.site_name}. All images are copyrighted and may not be used without permission.</span>
          <span>Design by <b className="font-medium tracking-[.1em] text-brand">{s.brand_name.toUpperCase()}</b></span>
        </div>
      </div>
    </footer>
  );
}
