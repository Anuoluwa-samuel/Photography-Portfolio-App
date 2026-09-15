'use client';

import { useCallback, useEffect, useRef, useState, type AnimationEvent } from 'react';
import { ArrowRight, Pause, Play } from 'lucide-react';
import {
  Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, forEachSlideOffset, type CarouselApi,
} from '@/components/ui/carousel';
import { SmartImage, useReducedMotionPreference } from '@/components/site/motion';
import { ViewfinderCorners } from '@/components/site/viewfinder-corners';
import { cn } from '@/lib/utils';

export interface ReelProject {
  id: number; slug: string; title: string; cover: string; categoryLabel: string | null;
}

const AUTOPLAY_MS = 5000;
const FOCUS_FALLOFF = 0.6; // how quickly slides fall out of focus as they leave the centre
const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Featured work as a "rack focus" reel: the centred frame is sharp and in full colour; neighbours fall out of focus
 * (blur, desaturate, dim, shrink) in proportion to their distance — linked to the drag, not just to slide changes.
 * Viewfinder corners lock onto the frame in focus; an exposure-timer line runs the 5s auto-advance, which pauses on
 * hover, focus, drag, when off-screen, with the pause button, and is off entirely under prefers-reduced-motion.
 */
export function FeaturedReel({ projects }: { projects: ReelProject[] }) {
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const reduceMotion = useReducedMotionPreference();
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRefs = useRef<(HTMLDivElement | null)[]>([]);
  const count = projects.length;
  const multi = count > 1;

  const applyFocus = useCallback((a: NonNullable<CarouselApi>, inViewOnly: boolean) => {
    const falloff = FOCUS_FALLOFF * a.scrollSnapList().length;
    const current = a.selectedScrollSnap();
    forEachSlideOffset(a, inViewOnly, (i, offset) => {
      const focus = reduceMotion ? (i === current ? 1 : 0.6) : clamp(1 - Math.abs(offset * falloff));
      frameRefs.current[i]?.style.setProperty('--focus', focus.toFixed(3));
    });
  }, [reduceMotion]);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => { setSelected(api.selectedScrollSnap()); if (reduceMotion) applyFocus(api, false); };
    const onScroll = () => { if (!reduceMotion) applyFocus(api, true); };
    const onReInit = () => { applyFocus(api, false); setSelected(api.selectedScrollSnap()); };
    const onDown = () => setDragging(true);
    const onUp = () => setDragging(false);
    applyFocus(api, false);
    onSelect();
    api.on('select', onSelect).on('scroll', onScroll).on('reInit', onReInit).on('pointerDown', onDown).on('pointerUp', onUp);
    return () => {
      api.off('select', onSelect).off('scroll', onScroll).off('reInit', onReInit).off('pointerDown', onDown).off('pointerUp', onUp);
    };
  }, [api, applyFocus, reduceMotion]);

  // Only run the timer while the reel is on screen.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(!!entry?.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const autoplay = multi && !reduceMotion && !userPaused;
  const running = autoplay && inView && !hovered && !focusWithin && !dragging;

  const advance = (e: AnimationEvent<HTMLSpanElement>) => {
    if (e.animationName !== 'exposure' || !api) return;
    if (api.canScrollNext()) api.scrollNext();
    else api.scrollTo(0);
  };

  return (
    <div
      ref={rootRef}
      className="mt-14"
      onPointerEnter={e => { if (e.pointerType === 'mouse') setHovered(true); }}
      onPointerLeave={() => setHovered(false)}
      // Keyboard focus pauses auto-advance (WCAG 2.2.2); focus left on an arrow after a mouse click doesn't.
      onFocusCapture={e => { if (e.target instanceof Element && e.target.matches(':focus-visible')) setFocusWithin(true); }}
      onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusWithin(false); }}
    >
      <Carousel setApi={setApi} opts={{ loop: count > 2, align: 'center' }} aria-label="Featured work">
        {/* Soft vignette at both edges: out-of-focus neighbours dissolve instead of being cropped */}
        <CarouselContent viewportClassName="-mx-4 px-4 py-8 [mask-image:linear-gradient(to_right,transparent,#000_10%,#000_90%,transparent)]">
          {projects.map((p, i) => {
            const active = i === selected;
            return (
              <CarouselItem key={p.id} aria-label={`${i + 1} of ${count}`} className={cn(multi ? 'basis-[88%] sm:basis-[72%] lg:basis-[60%]' : 'basis-full')}>
                <div ref={el => { frameRefs.current[i] = el; }} data-active={active} className="reel-frame group/slide relative">
                  <a
                    href={`/projects/${p.slug}`}
                    tabIndex={active ? 0 : -1}
                    aria-label={`View the ${p.title} project`}
                    onClick={e => {
                      // A peeking neighbour comes into focus first; the frame in focus opens the project.
                      if (!active && api) { e.preventDefault(); api.scrollTo(i); }
                    }}
                    className="relative block aspect-[16/10] overflow-hidden rounded-[24px] bg-card shadow-[0_32px_64px_-40px_var(--shadow-deep)] max-[600px]:aspect-[4/5]"
                  >
                    <SmartImage
                      src={p.cover} width={1200} height={750} loading={i === 0 ? 'eager' : 'lazy'} alt={`Cover photo for ${p.title}`}
                      className="size-full object-cover transition-[scale] duration-[1200ms] ease-[var(--ease)] group-hover/slide:scale-[1.04]"
                    />
                    <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-black/75 via-black/10 to-transparent" />
                    <ViewfinderCorners trigger="active" />
                    <div className="absolute inset-x-0 bottom-0 z-[3] translate-y-2 p-6 text-white opacity-0 transition-[translate,opacity] delay-150 duration-700 ease-[var(--ease)] group-data-[active=true]/slide:translate-y-0 group-data-[active=true]/slide:opacity-100 sm:p-10">
                      {p.categoryLabel && (
                        <span className="mb-2 block font-display text-[.68rem] uppercase tracking-[.24em] text-brand-bright">{p.categoryLabel}</span>
                      )}
                      <span className="block font-display text-[clamp(1.2rem,2.6vw,2rem)] uppercase leading-tight tracking-[.04em]">{p.title}</span>
                      <span className="mt-4 inline-flex items-center gap-2 font-display text-[.68rem] uppercase tracking-[.2em] text-white/80 [&_svg]:size-4">
                        View project <ArrowRight aria-hidden="true" className="transition-transform duration-300 group-hover/slide:translate-x-1" />
                      </span>
                    </div>
                  </a>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>

        {multi && (
          <div className="mt-8 flex items-center gap-4">
            <p className="shrink-0 font-display text-[.78rem] tabular-nums tracking-[.2em] text-muted-foreground" aria-live="polite">
              <span className="text-foreground">{pad(selected + 1)}</span> / {pad(count)}
            </p>
            {/* Exposure timer: fills over 5s, then advances. Static progress when auto-advance is off. */}
            <div aria-hidden="true" className="relative h-0.5 flex-1 overflow-hidden rounded-full bg-border">
              {autoplay ? (
                <span
                  key={selected}
                  onAnimationEnd={advance}
                  className="absolute inset-0 origin-left bg-brand [animation:exposure_linear_forwards]"
                  style={{ animationDuration: `${AUTOPLAY_MS}ms`, animationPlayState: running ? 'running' : 'paused' }}
                />
              ) : (
                <span
                  className="absolute inset-0 origin-left bg-brand transition-transform duration-700 ease-[var(--ease)]"
                  style={{ transform: `scaleX(${(selected + 1) / count})` }}
                />
              )}
            </div>
            {!reduceMotion && (
              <button
                type="button"
                onClick={() => setUserPaused(p => !p)}
                aria-label={userPaused ? 'Play slideshow' : 'Pause slideshow'}
                className="glass grid size-12 shrink-0 place-items-center rounded-full text-foreground outline-none transition-[scale,color] duration-300 hover:scale-105 hover:text-brand focus-visible:ring-2 focus-visible:ring-brand [&_svg]:size-4"
              >
                {userPaused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
              </button>
            )}
            <CarouselPrevious className="static shrink-0 translate-y-0" />
            <CarouselNext className="static shrink-0 translate-y-0" />
          </div>
        )}
      </Carousel>
    </div>
  );
}
