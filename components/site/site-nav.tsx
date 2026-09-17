'use client';

import { useEffect, useState } from 'react';
import { BriefcaseBusiness, CalendarCheck, House, Images, UserRound } from 'lucide-react';
import HoverGradientNavBar, { type HoverGradientMenuItem } from '@/components/ui/hover-gradient-nav-bar';
import { ThemeToggle } from '@/components/theme-toggle';
import { NAV_LINKS, type NavId } from '@/lib/site';

const GOLD_GLOW = 'radial-gradient(circle, rgba(245,184,46,0.18) 0%, rgba(154,106,0,0.07) 50%, rgba(154,106,0,0) 100%)';

const STYLES: Record<NavId, Omit<HoverGradientMenuItem, 'id' | 'label' | 'href'>> = {
  hero: {
    icon: <House className="h-4 w-4" />,
    gradient: GOLD_GLOW,
    iconColor: 'group-hover:text-brand',
    activeIconColor: 'text-brand',
  },
  about: {
    icon: <UserRound className="h-4 w-4" />,
    gradient: GOLD_GLOW,
    iconColor: 'group-hover:text-brand',
    activeIconColor: 'text-brand',
  },
  portfolio: {
    icon: <Images className="h-4 w-4" />,
    gradient: GOLD_GLOW,
    iconColor: 'group-hover:text-brand',
    activeIconColor: 'text-brand',
  },
  services: {
    icon: <BriefcaseBusiness className="h-4 w-4" />,
    gradient: GOLD_GLOW,
    iconColor: 'group-hover:text-brand',
    activeIconColor: 'text-brand',
  },
  contact: {
    icon: <CalendarCheck className="h-4 w-4" />,
    gradient: 'radial-gradient(circle, rgba(245,184,46,0.35) 0%, rgba(245,184,46,0.12) 50%, rgba(245,184,46,0) 100%)',
    iconColor: '',
    cta: true,
  },
};

const ITEMS: HoverGradientMenuItem[] = NAV_LINKS.map(link => ({
  ...link,
  ...STYLES[link.id],
  dataAttributes: 'book' in link ? { 'data-book': '' } : undefined,
}));
const SECTION_IDS = NAV_LINKS.map(l => l.id);

interface SiteNavProps {
  brandName: string;
  brandTagline: string;
  siteName: string;
  /** Fixed active item (e.g. "portfolio" on project pages). */
  activeId?: NavId;
  /** Highlight whichever homepage section is in view. */
  trackSections?: boolean;
}

export function SiteNav({ brandName, brandTagline, siteName, activeId, trackSections }: SiteNavProps) {
  const [inView, setInView] = useState<string | undefined>(activeId);

  useEffect(() => {
    if (!trackSections) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) setInView(en.target.id); });
    }, { rootMargin: '-40% 0px -55% 0px' });
    SECTION_IDS.forEach(id => { const el = document.getElementById(id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [trackSections]);

  return (
    <HoverGradientNavBar
      items={ITEMS}
      activeId={inView}
      brand={
        <a href="/#hero" aria-label={`${siteName} — home`} className="flex flex-col pl-2 leading-none lg:pl-0">
          <strong className="font-display text-[1.2rem] font-semibold uppercase tracking-[.16em] text-brand">{brandName}</strong>
          <small className="mt-[4px] pl-0.5 text-[.6rem] tracking-[.14em] text-muted-foreground">{brandTagline}</small>
        </a>
      }
      actions={<ThemeToggle />}
    />
  );
}
