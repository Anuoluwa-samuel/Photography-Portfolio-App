'use client';

import { Children, useEffect, useState, type ReactNode } from 'react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '@/components/ui/carousel';

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Two or more client quotes, one per slide. No auto-advance: quotes are read at the visitor's pace.
 * Slides arrive as server-rendered children so the full text is in the HTML.
 */
export function TestimonialCarousel({ children }: { children: ReactNode }) {
  const slides = Children.toArray(children);
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setSelected(api.selectedScrollSnap());
    onSelect();
    api.on('select', onSelect).on('reInit', onSelect);
    return () => { api.off('select', onSelect).off('reInit', onSelect); };
  }, [api]);

  return (
    <Carousel setApi={setApi} opts={{ loop: slides.length > 2, align: 'center' }} aria-label="Testimonial slides">
      <CarouselContent>
        {slides.map((slide, i) => (
          <CarouselItem key={i} aria-label={`${i + 1} of ${slides.length}`} className="basis-full">
            {slide}
          </CarouselItem>
        ))}
      </CarouselContent>
      <div className="mx-auto mt-10 flex max-w-[824px] items-center gap-4">
        <p className="shrink-0 font-display text-[.78rem] tabular-nums tracking-[.2em] text-muted-foreground" aria-live="polite">
          <span className="text-foreground">{pad(selected + 1)}</span> / {pad(slides.length)}
        </p>
        <div aria-hidden="true" className="relative h-0.5 flex-1 overflow-hidden rounded-full bg-border">
          <span
            className="absolute inset-0 origin-left bg-brand transition-transform duration-700 ease-[var(--ease)]"
            style={{ transform: `scaleX(${(selected + 1) / slides.length})` }}
          />
        </div>
        <CarouselPrevious className="static shrink-0 translate-y-0" />
        <CarouselNext className="static shrink-0 translate-y-0" />
      </div>
    </Carousel>
  );
}
