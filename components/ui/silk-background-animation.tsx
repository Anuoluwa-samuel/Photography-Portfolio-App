'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

// --- Silk background (adapted from 21st.dev) ---
// Fixed, full-page animated silk that follows the `dark` class (shadcn / next-themes convention):
// whitish-teal silk in light mode, dark silk in dark mode. Rendered at a fraction of screen
// resolution and scaled up by CSS (the pattern is soft, so it looks identical at a far lower cost).

type RGB = [number, number, number];

interface Palette {
  /** Colour at the silk's lowest intensity. */
  lo: RGB;
  /** Colour at the silk's highest intensity. */
  hi: RGB;
  overlay: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
}

const tealGlow = (ctx: CanvasRenderingContext2D, w: number, h: number, alpha: number) => {
  const g = ctx.createRadialGradient(w * 0.88, -h * 0.08, 0, w * 0.88, -h * 0.08, Math.max(w, h) * 0.8);
  g.addColorStop(0, `rgba(31, 209, 193, ${alpha})`);
  g.addColorStop(1, 'rgba(31, 209, 193, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
};

const PALETTES: Record<'light' | 'dark', Palette> = {
  light: {
    lo: [212, 228, 230],
    hi: [255, 255, 255],
    overlay: (ctx, w, h) => tealGlow(ctx, w, h, 0.14),
  },
  dark: {
    lo: [0, 0, 0],
    hi: [72, 82, 84],
    overlay: (ctx, w, h) => {
      // Subtle overlay for depth, as in the original
      const v = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 2);
      v.addColorStop(0, 'rgba(0, 0, 0, 0.1)');
      v.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, w, h);
      tealGlow(ctx, w, h, 0.08);
    },
  },
};

const RESOLUTION = 0.25; // fraction of the viewport size actually rendered
const FRAME_MS = 1000 / 30;
const SPEED = 0.02;
const SCALE = 2;
const NOISE_INTENSITY = 0.8;

// Simple noise function
const noise = (x: number, y: number) => {
  const G = 2.71828;
  const rx = G * Math.sin(G * x);
  const ry = G * Math.sin(G * y);
  return (rx * ry * (1 + x)) % 1;
};

export function SilkBackground({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let image = ctx.createImageData(1, 1);
    let time = 0;
    let last = 0;
    let raf = 0;

    const draw = () => {
      const { width: w, height: h } = canvas;
      const p = document.documentElement.classList.contains('dark') ? PALETTES.dark : PALETTES.light;
      const data = image.data;
      const t = SPEED * time;

      for (let y = 0; y < h; y++) {
        const v = (y / h) * SCALE;
        for (let x = 0; x < w; x++) {
          const u = (x / w) * SCALE;
          const texY = v + 0.03 * Math.sin(8.0 * u - t);
          const pattern = 0.6 + 0.4 * Math.sin(
            5.0 * (u + texY + Math.cos(3.0 * u + 5.0 * texY) + 0.02 * t) +
            Math.sin(20.0 * (u + texY - 0.1 * t)),
          );
          const k = Math.min(1, Math.max(0, pattern - (noise(x, y) / 15.0) * NOISE_INTENSITY));
          const i = (y * w + x) * 4;
          data[i] = p.lo[0] + (p.hi[0] - p.lo[0]) * k;
          data[i + 1] = p.lo[1] + (p.hi[1] - p.lo[1]) * k;
          data[i + 2] = p.lo[2] + (p.hi[2] - p.lo[2]) * k;
          data[i + 3] = 255;
        }
      }

      ctx.putImageData(image, 0, 0);
      p.overlay(ctx, w, h);
    };

    const resize = () => {
      canvas.width = Math.max(1, Math.ceil(window.innerWidth * RESOLUTION));
      canvas.height = Math.max(1, Math.ceil(window.innerHeight * RESOLUTION));
      image = ctx.createImageData(canvas.width, canvas.height);
      draw();
    };

    const animate = (now: number) => {
      raf = requestAnimationFrame(animate);
      if (now - last < FRAME_MS) return;
      time += last ? (now - last) / (1000 / 60) : 1; // same pace as the original 60fps loop
      last = now;
      draw();
    };

    resize();
    setIsLoaded(true);
    window.addEventListener('resize', resize);
    if (!reduceMotion) raf = requestAnimationFrame(animate);

    // Repaint immediately when the theme is toggled (matters most when motion is reduced).
    const themeObserver = new MutationObserver(draw);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      themeObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn(
        'pointer-events-none fixed inset-0 z-[-2] h-full w-full transition-opacity duration-1000',
        isLoaded ? 'opacity-100' : 'opacity-0',
        className,
      )}
    />
  );
}

export { SilkBackground as Component };
