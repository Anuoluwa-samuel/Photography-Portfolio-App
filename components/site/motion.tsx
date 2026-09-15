'use client';

import { useEffect, useRef, useState, type CSSProperties, type ImgHTMLAttributes, type ReactNode } from 'react';
import { cn, cssVars } from '@/lib/utils';

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export { useReducedMotionPreference } from '@/hooks/use-reduced-motion';

/* ------------------------------------------------------------------
   Scroll reveal
------------------------------------------------------------------ */
const VARIANT_CLASS = { up: 'reveal', img: 'reveal-img', fade: 'card-reveal' } as const;

export function Reveal({
  variant = 'up', delay = 0, className, style, children,
}: { variant?: keyof typeof VARIANT_CLASS; delay?: number; className?: string; style?: CSSProperties; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([en]) => {
      if (en.isIntersecting) { setInView(true); obs.disconnect(); }
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn(VARIANT_CLASS[variant], inView && 'in', className)} style={{ ...style, ...cssVars({ '--d': `${delay}s` }) }}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------
   Image with load fade-in + graceful fallback if the source fails
------------------------------------------------------------------ */
export function SmartImage({
  fadeIn, fallbackClassName = 'absolute inset-0', className, alt = '', ...props
}: ImgHTMLAttributes<HTMLImageElement> & { fadeIn?: boolean; fallbackClassName?: string }) {
  const ref = useRef<HTMLImageElement>(null);
  const [state, setState] = useState<'loading' | 'loaded' | 'failed'>('loading');

  // The image may finish (or fail) before hydration attaches onLoad/onError.
  useEffect(() => {
    const img = ref.current;
    if (img?.complete) setState(img.naturalWidth ? 'loaded' : 'failed');
  }, []);

  if (state === 'failed') {
    return <div data-failed aria-hidden="true" className={cn('bg-linear-to-br from-card-2 to-card', fallbackClassName)} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- CMS images (uploads + remote), served by Express
    <img
      ref={ref}
      alt={alt}
      decoding="async"
      onLoad={() => setState('loaded')}
      onError={() => setState('failed')}
      className={cn(fadeIn && 'opacity-0 transition-[opacity,transform] duration-[900ms] ease-[var(--ease)]', fadeIn && state === 'loaded' && 'opacity-100', className)}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------
   Page curtain
------------------------------------------------------------------ */
export function Curtain({ brand }: { brand: string }) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const finish = () => { timer = setTimeout(() => setDone(true), prefersReducedMotion() ? 0 : 350); };
    if (document.readyState === 'complete') finish();
    else window.addEventListener('load', finish, { once: true });
    const safety = setTimeout(() => setDone(true), 3500); // never leave the curtain up if load stalls
    return () => { clearTimeout(timer); clearTimeout(safety); window.removeEventListener('load', finish); };
  }, []);

  return (
    <div className={cn('curtain', done && 'done')} aria-hidden="true">
      <strong>{brand}</strong>
    </div>
  );
}

/* ------------------------------------------------------------------
   Subtle parallax on the hero portrait (desktop only)
------------------------------------------------------------------ */
export function HeroParallax({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const onScroll = () => {
      if (window.innerWidth < 901) { el.style.transform = ''; return; }
      el.style.transform = `translateY(${Math.min(window.scrollY, window.innerHeight) * 0.08}px)`;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return <div ref={ref} className={className}>{children}</div>;
}

/* ------------------------------------------------------------------
   Stat counter
------------------------------------------------------------------ */
export function CountUp({ value, suffix = '', className }: { value: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const obs = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      obs.disconnect();
      const dur = prefersReducedMotion() ? 0 : 1600, t0 = performance.now();
      const tick = (now: number) => {
        const p = dur ? Math.min(1, (now - t0) / dur) : 1;
        setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => { obs.disconnect(); cancelAnimationFrame(raf); };
  }, [value]);

  return <div ref={ref} className={className}>{n.toLocaleString('en-US')}{suffix}</div>;
}
