'use client';

import { useEffect } from 'react';
import { SonarGrid } from '@/components/ui/sonar-grid';

// "Content": taps on these never ping, and they keep their normal cursor. Keep in sync with public/admin/effects.js.
const CONTENT_SELECTOR = [
  'a', 'button', 'input', 'select', 'textarea', 'label', 'summary', 'option', 'iframe',
  '[role="button"]', '[role="dialog"]', '[contenteditable]',
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'dt', 'dd', 'blockquote', 'cite', 'figure', 'figcaption',
  'img', 'picture', 'video', 'svg', 'table', 'code', 'pre', 'small', 'strong', 'em', 'b', 'i', 'span',
  'header', '.glass', '[data-slot="glass-card"]', '[data-slot="dialog-content"]',
].join(',');

/** True when the pointer is over bare background — not text, media, controls, the nav or glass panels. */
export function isEmptySpace(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  if (target.closest(CONTENT_SELECTOR)) return false;
  // Loose text sitting directly inside a container also counts as content.
  for (const node of Array.from(target.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) return false;
  }
  return true;
}

/**
 * Site-wide sonar dot field: one fixed layer behind every page (above the silk, below the content), so the dots
 * run continuously through every section with no seams. Tapping empty space sends a ping, and the viewfinder
 * crosshair cursor appears only over empty space (see `html[data-sonar-cursor]` in globals.css).
 */
export function SiteSonar() {
  useEffect(() => {
    const root = document.documentElement;
    let on = false;
    const onMove = (e: PointerEvent) => {
      const next = e.pointerType === 'mouse' && isEmptySpace(e.target);
      if (next === on) return; // only touch the DOM when the state flips
      on = next;
      if (on) root.dataset.sonarCursor = 'on';
      else delete root.dataset.sonarCursor;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      delete root.dataset.sonarCursor;
    };
  }, []);

  return (
    <SonarGrid
      aria-hidden="true"
      pointerTarget="window"
      shouldPing={e => isEmptySpace(e.target)}
      className="pointer-events-none fixed inset-0 z-[-1] opacity-75"
    />
  );
}
