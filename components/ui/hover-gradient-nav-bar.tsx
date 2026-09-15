'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { useReducedMotionPreference } from '@/hooks/use-reduced-motion';
import { cn } from '@/lib/utils';

// --- HoverGradientNavBar Component ---
// Adapted from 21st.dev: top-anchored glass bar with a brand slot, action slot,
// active-section state and a mobile sheet. The per-item 3D flip + radial glow is unchanged.

export interface HoverGradientMenuItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  href: string;
  gradient: string;
  iconColor: string;
  /** Icon colour while the item is the active section. */
  activeIconColor?: string;
  /** Render as the filled call-to-action pill. */
  cta?: boolean;
  /** Extra data-* attributes for the link (e.g. hooks for click handlers elsewhere). */
  dataAttributes?: Record<`data-${string}`, string>;
}

interface HoverGradientNavBarProps {
  items: HoverGradientMenuItem[];
  activeId?: string;
  brand?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

// Animation variants
const itemVariants: Variants = {
  initial: { rotateX: 0, opacity: 1 },
  hover: { rotateX: -90, opacity: 0 },
};

const backVariants: Variants = {
  initial: { rotateX: 90, opacity: 0 },
  hover: { rotateX: 0, opacity: 1 },
};

const glowVariants: Variants = {
  initial: { opacity: 0, scale: 0.8 },
  hover: {
    opacity: 1,
    scale: 2,
    transition: {
      opacity: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
      scale: { duration: 0.5, type: 'spring', stiffness: 300, damping: 25 },
    },
  },
};

const sharedTransition = {
  type: 'spring' as const,
  stiffness: 100,
  damping: 20,
  duration: 0.5,
};

function NavItem({
  item, active, flip, stacked, onNavigate,
}: { item: HoverGradientMenuItem; active: boolean; flip: boolean; stacked?: boolean; onNavigate?: () => void }) {
  const face = cn(
    'flex items-center gap-2 rounded-full px-4 py-2 font-display text-[.72rem] font-medium uppercase tracking-[.2em] transition-colors',
    stacked ? 'justify-start py-3 text-[.8rem]' : 'justify-center',
    item.cta
      ? 'bg-brand text-brand-foreground'
      : cn('text-muted-foreground group-hover:text-foreground', active && 'text-foreground'),
  );
  const content = (
    <>
      <span className={cn('transition-colors duration-300', !item.cta && item.iconColor, active && item.activeIconColor)}>{item.icon}</span>
      <span>{item.label}</span>
    </>
  );

  return (
    <motion.li className="relative">
      <motion.div
        className="group relative block overflow-visible rounded-full"
        style={{ perspective: '600px' }}
        whileHover="hover"
        initial="initial"
      >
        {/* Per-item glow */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-0 rounded-full"
          variants={glowVariants}
          style={{ background: item.gradient, opacity: 0 }}
        />
        {/* Resting glow for the section in view */}
        {active && !item.cta && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 scale-125 rounded-full" style={{ background: item.gradient }} />
        )}
        {/* Front-facing */}
        <motion.a
          href={item.href}
          {...item.dataAttributes}
          onClick={onNavigate}
          aria-current={active ? 'location' : undefined}
          className={cn(face, 'relative z-10')}
          variants={flip ? itemVariants : undefined}
          transition={sharedTransition}
          style={{ transformStyle: 'preserve-3d', transformOrigin: 'center bottom' }}
        >
          {content}
        </motion.a>
        {/* Back-facing (decorative duplicate — hidden from assistive tech and tab order) */}
        {flip && (
          <motion.a
            href={item.href}
            {...item.dataAttributes}
            onClick={onNavigate}
            aria-hidden="true"
            tabIndex={-1}
            className={cn(face, 'absolute inset-0 z-10')}
            variants={backVariants}
            transition={sharedTransition}
            style={{ transformStyle: 'preserve-3d', transformOrigin: 'center top', transform: 'rotateX(90deg)' }}
          >
            {content}
          </motion.a>
        )}
      </motion.div>
    </motion.li>
  );
}

function HoverGradientNavBar({ items, activeId, brand, actions, className }: HoverGradientNavBarProps): React.JSX.Element {
  // Hydration-safe: framer's useReducedMotion reads the media query during the first client render, which made the
  // decorative back faces render on the server but not in a reduced-motion browser (React hydration error #418).
  const reduceMotion = useReducedMotionPreference();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const wide = window.matchMedia('(min-width: 1024px)');
    const onWide = (e: MediaQueryListEvent) => { if (e.matches) setOpen(false); };
    window.addEventListener('keydown', onKey);
    wide.addEventListener('change', onWide);
    return () => { window.removeEventListener('keydown', onKey); wide.removeEventListener('change', onWide); };
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-[100] transition-[padding] duration-500 ease-[var(--ease)]',
        scrolled ? 'pt-2 lg:pt-3' : 'pt-4 lg:pt-5',
        className,
      )}
    >
      <div className={cn('site-container transition-[width] duration-700 ease-[var(--ease)]', scrolled && 'lg:[--max:1100px]')}>
        <nav
          aria-label="Primary"
          className={cn(
            'glass relative flex items-center justify-between gap-3 rounded-2xl px-3 py-2 lg:rounded-full lg:pl-6 lg:pr-2',
            'transition-[background-color,box-shadow,padding] duration-500',
            scrolled ? 'glass-strong lg:py-2' : 'lg:py-3',
          )}
        >
          {brand}

          <ul className="hidden items-center gap-1 lg:flex xl:gap-2">
            {items.map(item => (
              <NavItem key={item.id} item={item} active={item.id === activeId} flip={!reduceMotion} />
            ))}
          </ul>

          <div className="flex items-center gap-2">
            {actions}
            <button
              type="button"
              className="glass relative grid size-10 place-items-center rounded-full lg:hidden"
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen(o => !o)}
            >
              <span aria-hidden="true" className={cn('absolute h-[1.5px] w-[16px] bg-foreground transition-transform duration-300', open ? 'rotate-45' : '-translate-y-[4px]')} />
              <span aria-hidden="true" className={cn('absolute h-[1.5px] w-[16px] bg-foreground transition-opacity duration-300', open && 'opacity-0')} />
              <span aria-hidden="true" className={cn('absolute h-[1.5px] w-[16px] bg-foreground transition-transform duration-300', open ? '-rotate-45' : 'translate-y-[4px]')} />
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {open && (
            <motion.div
              id="mobile-nav"
              className="glass glass-strong mt-2 overflow-hidden rounded-2xl p-2 lg:hidden"
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <ul className="flex flex-col gap-1">
                {items.map(item => (
                  <NavItem key={item.id} item={item} active={item.id === activeId} flip={false} stacked onNavigate={() => setOpen(false)} />
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

export default HoverGradientNavBar;
