import { Fragment } from 'react';

/** "Light that [[remembers]] the moment" -> text with <em> around the accent word(s). */
export function Accent({ text }: { text: string }) {
  const parts = String(text || '').split(/\[\[(.+?)\]\]/g);
  return (
    <>
      {parts.map((part, i) => (i % 2 ? <em key={i}>{part}</em> : <Fragment key={i}>{part}</Fragment>))}
    </>
  );
}

/** Multi-paragraph text -> array of paragraphs. */
export const paragraphs = (str: string) => String(str || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

export const telHref = (phone: string) => 'tel:' + String(phone || '').replace(/[^+\d]/g, '');
