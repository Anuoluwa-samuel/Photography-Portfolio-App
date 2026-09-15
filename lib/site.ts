/** Primary navigation — used by the header and the footer. */
export const NAV_LINKS = [
  { id: 'hero', label: 'Home', href: '/#hero' },
  { id: 'about', label: 'About', href: '/#about' },
  { id: 'portfolio', label: 'Portfolio', href: '/#portfolio' },
  { id: 'services', label: 'Services', href: '/#services' },
  { id: 'contact', label: 'Book a session', href: '/#contact', book: true }, // opens the booking popup (BookingProvider)
] as const;

export type NavId = (typeof NAV_LINKS)[number]['id'];

/** Letter favicon in the brand colours. */
export function brandIcon(brandName: string) {
  const letter = (brandName.charAt(0) || 'Y').toUpperCase().replace(/[^A-Z0-9]/, 'Y');
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='14' fill='#0b0d0e'/><text x='50%' y='57%' dominant-baseline='middle' text-anchor='middle' font-family='Arial,sans-serif' font-weight='700' font-size='38' fill='#1fd1c1'>${letter}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
