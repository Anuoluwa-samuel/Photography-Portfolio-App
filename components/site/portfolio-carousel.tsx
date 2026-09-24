'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import {
  Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, forEachSlideOffset, type CarouselApi,
} from '@/components/ui/carousel';
import { SmartImage, useReducedMotionPreference } from '@/components/site/motion';
import { ViewfinderCorners } from '@/components/site/viewfinder-corners';

export interface GridProject {
  id: number; slug: string; title: string; cover: string;
  categorySlug: string | null; categoryLabel: string | null;
}

const PARALLAX = 0.5; // how far photos drift inside their frames while the strip moves
const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

/**
 * Portfolio as an endless "contact sheet" strip: it loops in both directions (the first project follows the last),
 * free drag with momentum, photos drifting inside their frames as the strip pans (parallax), viewfinder corners on
 * hover/focus, a film-scrubber that wraps with the loop, and cards that "develop in" when the filter changes.
 * Filters with too few projects to fill the strip can't loop; Embla then falls back to a normal strip.
 */
export function PortfolioCarousel({ projects, categories }: { projects: GridProject[]; categories: { slug: string; label: string }[] }) {
  const [filter, setFilter] = useState('all');
  const [api, setApi] = useState<CarouselApi>();
  const reduceMotion = useReducedMotionPreference();
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const shown = filter === 'all' ? projects : projects.filter(p => p.categorySlug === filter);

  const update = useCallback((a: NonNullable<CarouselApi>, inViewOnly: boolean) => {
    const snaps = Math.max(1, a.scrollSnapList().length);
    if (!reduceMotion) {
      forEachSlideOffset(a, inViewOnly, (i, offset) => {
        layerRefs.current[i]?.style.setProperty('--parallax', clamp(offset * snaps * PARALLAX, -1, 1).toFixed(3));
      });
    }

    // Scrubber: thumb size = share of the strip in view. When looping, the thumb runs off the right end and
    // re-enters from the left (second segment), mirroring the strip; otherwise it travels within the track.
    const thumb = thumbRef.current, wrap = wrapRef.current;
    if (!thumb || !wrap) return;
    const engine = a.internalEngine();
    const looping = engine.options.loop && engine.slideLooper.canLoop();
    const width = clamp(Math.max(1, a.slidesInView().length) / Math.max(1, a.slideNodes().length), 0.08, 1);
    const progress = clamp(a.scrollProgress());
    if (looping) {
      const overflow = Math.max(0, progress + width - 1);
      thumb.style.left = `${progress * 100}%`;
      thumb.style.width = `${(width - overflow) * 100}%`;
      wrap.style.width = `${overflow * 100}%`;
    } else {
      thumb.style.left = `${progress * (1 - width) * 100}%`;
      thumb.style.width = `${width * 100}%`;
      wrap.style.width = '0%';
    }
  }, [reduceMotion]);

  useEffect(() => {
    if (!api) return;
    const onScroll = () => update(api, true);
    const onSettle = () => update(api, false);
    update(api, false);
    // slidesInView is computed asynchronously (IntersectionObserver), so also refresh when it reports — otherwise the
    // scrubber thumb can size itself from a stale count right after the cards re-mount on a filter change.
    api.on('scroll', onScroll).on('reInit', onSettle).on('settle', onSettle).on('resize', onSettle).on('slidesInView', onSettle);
    return () => { api.off('scroll', onScroll).off('reInit', onSettle).off('settle', onSettle).off('resize', onSettle).off('slidesInView', onSettle); };
  }, [api, update]);

  // New filter: back to the first project (the cards re-mount and develop in).
  useEffect(() => {
    api?.scrollTo(0, true);
  }, [api, filter]);

  return (
    <>
      <div className="mt-12 flex flex-wrap gap-2" role="group" aria-label="Filter portfolio by category">
        {[{ slug: 'all', label: 'All' }, ...categories].map(c => (
          <button
            key={c.slug}
            type="button"
            aria-pressed={filter === c.slug}
            onClick={() => setFilter(c.slug)}
            className="glass rounded-full px-4 py-3 font-display text-[.7rem] uppercase tracking-[.18em] text-muted-foreground transition-[background-color,color,border-color,transform] duration-300 lg:py-2 hover:border-brand/50 hover:text-foreground active:scale-[.96] aria-pressed:border-brand aria-pressed:bg-brand aria-pressed:text-brand-foreground"
          >
            {c.label}
          </button>
        ))}
      </div>

      <Carousel setApi={setApi} opts={{ align: 'start', dragFree: true, loop: true }} aria-label="Portfolio projects" className="mt-8">
        <CarouselContent viewportClassName="-mx-4 px-4 py-4 [mask-image:linear-gradient(to_right,transparent,#000_4%,#000_88%,transparent)] max-[600px]:[mask-image:none]">
          {shown.map((p, i) => (
            <CarouselItem key={`${filter}-${p.id}`} aria-label={`${i + 1} of ${shown.length}`} className="basis-[80%] sm:basis-[48%] lg:basis-[32%] xl:basis-[28%]">
              <a
                href={`/projects/${p.slug}`}
                aria-label={`View the ${p.title} project`}
                className="develop-in group relative block aspect-[4/5] overflow-hidden rounded-[16px] bg-card shadow-[0_24px_48px_-32px_var(--shadow-deep)]"
                style={{ animationDelay: `${Math.min(i, 6) * 80}ms` }}
              >
                {/* Parallax layer: wider than the frame, drifts opposite to the pan */}
                <div ref={el => { layerRefs.current[i] = el; }} className="absolute inset-y-0 -inset-x-[12%] [translate:calc(var(--parallax,0)*-8%)_0]">
                  <SmartImage
                    src={p.cover} width={800} height={1000} loading="lazy" alt={`Cover photo for ${p.title}`}
                    fadeIn fallbackClassName="absolute inset-0"
                    className="size-full object-cover transition-[opacity,scale] duration-[1200ms] ease-[var(--ease)] group-hover:scale-[1.06] group-focus-visible:scale-[1.06]"
                  />
                </div>
                <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-black/80 via-black/5 to-transparent opacity-80 transition-opacity duration-500 group-hover:opacity-100" />
                <ViewfinderCorners trigger="hover" />
                <div className="absolute inset-x-0 bottom-0 z-[3] p-6 text-white">
                  {p.categoryLabel && <span className="mb-1 block font-display text-[.64rem] uppercase tracking-[.24em] text-brand-bright">{p.categoryLabel}</span>}
                  <span className="block font-display text-[.9rem] uppercase tracking-[.12em]">{p.title}</span>
                  <span className="mt-2 flex h-0 items-center gap-2 overflow-hidden font-display text-[.64rem] uppercase tracking-[.2em] text-white/80 opacity-0 transition-[height,opacity] duration-500 ease-[var(--ease)] group-hover:h-4 group-hover:opacity-100 group-focus-visible:h-4 group-focus-visible:opacity-100 [&_svg]:size-4">
                    View project <ArrowRight aria-hidden="true" />
                  </span>
                </div>
              </a>
            </CarouselItem>
          ))}
        </CarouselContent>

        <div className="mt-8 flex items-center gap-4">
          <p className="shrink-0 font-display text-[.72rem] uppercase tracking-[.2em] text-dim" aria-live="polite">
            {shown.length} {shown.length === 1 ? 'project' : 'projects'}
          </p>
          {/* Film scrubber (wraps around with the loop) */}
          <div aria-hidden="true" className="relative h-0.5 flex-1 overflow-hidden rounded-full bg-border">
            <span ref={thumbRef} className="absolute inset-y-0 left-0 w-full rounded-full bg-brand" />
            <span ref={wrapRef} className="absolute inset-y-0 left-0 w-0 rounded-full bg-brand" />
          </div>
          <CarouselPrevious className="static shrink-0 translate-y-0" />
          <CarouselNext className="static shrink-0 translate-y-0" />
        </div>
      </Carousel>
    </>
  );
}
