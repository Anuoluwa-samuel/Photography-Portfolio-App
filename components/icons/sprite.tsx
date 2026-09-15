import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';

/** Stroke icon sprite. Ids are stored in the CMS (services, stats, about points, socials) — see src/constants.js. */
export function IconSprite() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <symbol id="i-arrow" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></symbol>
      <symbol id="i-close" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></symbol>
      <symbol id="i-prev" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></symbol>
      <symbol id="i-next" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></symbol>
      <symbol id="i-camera" viewBox="0 0 48 48"><path d="M8 16h7l3-5h12l3 5h7v22H8z" /><circle cx="24" cy="27" r="7" /><path d="M36 21h2" /></symbol>
      <symbol id="i-ring" viewBox="0 0 48 48"><circle cx="24" cy="28" r="11" /><path d="M19 12l5-6 5 6-5 5z" /><path d="M24 17v0" /></symbol>
      <symbol id="i-calendar" viewBox="0 0 48 48"><rect x="7" y="10" width="34" height="30" rx="3" /><path d="M7 19h34M16 6v8M32 6v8" /><path d="M15 27h4M22 27h4M29 27h4M15 33h4M22 33h4" /></symbol>
      <symbol id="i-hanger" viewBox="0 0 48 48"><path d="M24 8a4 4 0 1 1 4 4c-2 0-4 1.5-4 4v3" /><path d="M24 19 6 32v4h36v-4L24 19z" /></symbol>
      <symbol id="i-box" viewBox="0 0 48 48"><path d="M8 16 24 8l16 8v16l-16 8-16-8z" /><path d="M8 16l16 8 16-8M24 24v16" /></symbol>
      <symbol id="i-briefcase" viewBox="0 0 48 48"><rect x="6" y="15" width="36" height="24" rx="3" /><path d="M18 15v-4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4M6 25h36" /></symbol>
      <symbol id="i-wand" viewBox="0 0 48 48"><path d="M8 40 30 18" /><path d="m28 12 2 4 4 2-4 2-2 4-2-4-4-2 4-2zM38 6l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM40 24l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" /></symbol>
      <symbol id="i-frame" viewBox="0 0 48 48"><rect x="8" y="8" width="32" height="32" rx="3" /><path d="M8 32l9-9 7 7 5-5 11 11" /><circle cx="31" cy="17" r="3" /></symbol>
      <symbol id="i-users" viewBox="0 0 48 48"><circle cx="18" cy="16" r="6" /><circle cx="32" cy="18" r="5" /><path d="M6 38c0-7 5-11 12-11s12 4 12 11M28 36c1-5 5-8 10-8 3 0 5 1 7 3" /></symbol>
      <symbol id="i-heart" viewBox="0 0 48 48"><path d="M24 41S6 30 6 17a9 9 0 0 1 18-2 9 9 0 0 1 18 2c0 13-18 24-18 24z" /></symbol>
      <symbol id="i-star" viewBox="0 0 48 48"><path d="m24 6 5.5 11.5L42 19l-9 8.8 2.2 12.6L24 34.5l-11.2 5.9L15 27.8 6 19l12.5-1.5z" /></symbol>
      <symbol id="i-eye" viewBox="0 0 48 48"><path d="M4 24s8-12 20-12 20 12 20 12-8 12-20 12S4 24 4 24z" /><circle cx="24" cy="24" r="6" /></symbol>
      <symbol id="i-sun" viewBox="0 0 48 48"><circle cx="24" cy="24" r="8" /><path d="M24 6v5M24 37v5M6 24h5M37 24h5M11 11l3.5 3.5M33.5 33.5 37 37M11 37l3.5-3.5M33.5 14.5 37 11" /></symbol>
      <symbol id="i-mail" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></symbol>
      <symbol id="i-phone" viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></symbol>
      <symbol id="i-pin" viewBox="0 0 24 24"><path d="M12 22s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></symbol>
      <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></symbol>
      <symbol id="i-instagram" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><path d="M17.5 6.5v0" /></symbol>
      <symbol id="i-facebook" viewBox="0 0 24 24"><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z" /></symbol>
      <symbol id="i-tiktok" viewBox="0 0 24 24"><path d="M14 4v11a3.5 3.5 0 1 1-3.5-3.5" /><path d="M14 4a5 5 0 0 0 5 5" /></symbol>
      <symbol id="i-x" viewBox="0 0 24 24"><path d="M4 4l16 16M20 4 4 20" /></symbol>
      <symbol id="i-linkedin" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 11v6M8 8v0M12 17v-6M12 13a2.5 2.5 0 0 1 5 0v4" /></symbol>
      <symbol id="i-youtube" viewBox="0 0 24 24"><rect x="2.5" y="6" width="19" height="12" rx="4" /><path d="m10 9.5 5 2.5-5 2.5z" /></symbol>
    </svg>
  );
}

export function Icon({ name, className, ...props }: { name: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      className={cn('fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round]', className)}
      {...props}
    >
      <use href={`#i-${name}`} />
    </svg>
  );
}
