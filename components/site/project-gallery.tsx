'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icons/sprite';
import { SmartImage } from '@/components/site/motion';
import { cn } from '@/lib/utils';

export interface GalleryItem {
  id: number; title: string; alt: string; caption: string;
  full: string; thumb: string; width: number; height: number;
}

const lbBtn = 'absolute grid size-[56px] place-items-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition-[border-color,color,transform] duration-300 hover:scale-[1.06] hover:border-brand-bright hover:text-brand-bright max-[600px]:size-12 [&_svg]:size-5 [&_svg]:stroke-[1.6]';

export function ProjectGallery({ items }: { items: GalleryItem[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const [src, setSrc] = useState('');
  const [ready, setReady] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const touchX = useRef<number | null>(null);
  const open = index !== null;

  const show = useCallback((i: number) => setIndex((i + items.length) % items.length), [items.length]);
  const close = useCallback(() => { setIndex(null); setReady(false); }, []);

  // Preload the full-size image, fall back to the thumbnail, and warm neighbours.
  useEffect(() => {
    if (index === null) return;
    const g = items[index];
    let cancelled = false;
    setReady(false);
    const pre = new Image();
    pre.onload = () => { if (!cancelled) { setSrc(g.full); requestAnimationFrame(() => setReady(true)); } };
    pre.onerror = () => { if (!cancelled) { setSrc(g.thumb); setReady(true); } };
    pre.src = g.full;
    [1, -1].forEach(d => { new Image().src = items[(index + d + items.length) % items.length].full; });
    return () => { cancelled = true; };
  }, [index, items]);

  // Scroll lock + focus management.
  useEffect(() => {
    if (!open) return;
    lastFocus.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => { document.body.style.overflow = ''; lastFocus.current?.focus(); };
  }, [open]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') show(index + 1);
      if (e.key === 'ArrowLeft') show(index - 1);
      if (e.key === 'Tab' && dialogRef.current) { // keep focus inside the dialog
        const f = [...dialogRef.current.querySelectorAll('button')], first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, show, close]);

  const current = index !== null ? items[index] : null;

  return (
    <>
      <div className="mt-14 columns-3 gap-[16px] max-[900px]:columns-2 max-[480px]:columns-1">
        {items.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => show(i)}
            aria-label={`Open image ${i + 1} of ${items.length} in full-screen viewer`}
            className="tile-in group relative mb-[16px] block w-full cursor-zoom-in break-inside-avoid overflow-hidden rounded-[16px] bg-card p-0 text-left"
            style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
          >
            <SmartImage
              src={img.thumb} width={img.width} height={img.height} loading="lazy" alt={img.alt}
              fadeIn fallbackClassName="aspect-[4/5] w-full"
              className="h-auto w-full scale-[1.01] duration-[1200ms] group-hover:scale-[1.045] group-focus-visible:scale-[1.045]"
            />
            {img.caption && (
              <div className="absolute inset-0 flex flex-col justify-end bg-linear-to-b from-transparent from-45% to-black/85 p-5 font-display text-[.82rem] uppercase tracking-[.12em] text-white opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100 group-has-[[data-failed]]:opacity-100">
                {img.caption}
              </div>
            )}
          </button>
        ))}
      </div>

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Image viewer"
        aria-hidden={!open}
        onClick={e => { if (e.target === e.currentTarget) close(); }}
        onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={e => {
          if (touchX.current === null || index === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
        }}
        className={cn(
          'fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(6,8,9,.94)] backdrop-blur-[10px] transition-[opacity,visibility] duration-[450ms]',
          open ? 'visible opacity-100' : 'invisible opacity-0',
        )}
      >
        <button ref={closeRef} type="button" onClick={close} aria-label="Close viewer" className={cn(lbBtn, 'right-[24px] top-[24px] max-[600px]:right-3 max-[600px]:top-3')}><Icon name="close" /></button>
        <button type="button" onClick={() => index !== null && show(index - 1)} aria-label="Previous image" className={cn(lbBtn, 'left-[24px] top-1/2 -translate-y-1/2 max-[600px]:left-2')}><Icon name="prev" /></button>
        <button type="button" onClick={() => index !== null && show(index + 1)} aria-label="Next image" className={cn(lbBtn, 'right-[24px] top-1/2 -translate-y-1/2 max-[600px]:right-2')}><Icon name="next" /></button>

        <figure className="flex max-w-[min(1240px,92vw)] flex-col items-center gap-4">
          {src && (
            // eslint-disable-next-line @next/next/no-img-element -- full-size CMS image
            <img
              src={src}
              alt={current?.alt ?? ''}
              className={cn(
                'max-h-[78vh] w-auto max-w-full rounded-lg object-contain shadow-[0_40px_90px_-30px_rgba(0,0,0,.95)] transition-[transform,opacity] duration-500 ease-[var(--ease)]',
                open && ready ? 'scale-100 opacity-100' : 'scale-[.96] opacity-0',
              )}
            />
          )}
          <figcaption className="flex w-full justify-between gap-5 font-display text-[.74rem] uppercase tracking-[.16em] text-white/60">
            <b className="font-normal text-white">{current?.title}</b>
            <span>{index !== null && `${index + 1} / ${items.length}`}</span>
          </figcaption>
        </figure>
      </div>
    </>
  );
}
