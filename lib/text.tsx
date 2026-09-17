import { Fragment } from 'react';
import { Typewriter } from '@/components/ui/typewriter';

/**
 * "Light that [[remembers]] the moment" -> text with <em> around the accent word(s).
 * "Light that [[remembers|captures|holds]] the moment" -> the accent types through each word in turn.
 */
export function Accent({ text }: { text: string }) {
  const parts = String(text || '').split(/\[\[(.+?)\]\]/g);
  return (
    <>
      {parts.map((part, i) => {
        if (!(i % 2)) return <Fragment key={i}>{part}</Fragment>;
        const words = part.split('|').map(w => w.trim()).filter(Boolean);
        if (words.length < 2) return <em key={i}>{part}</em>;
        return (
          <em key={i}>
            <span className="sr-only">{words[0]}</span>
            <span aria-hidden="true">
              <Typewriter text={words} speed={70} deleteSpeed={40} waitTime={2200} cursorChar="_" className="tracking-normal" />
            </span>
          </em>
        );
      })}
    </>
  );
}

/** Multi-paragraph text -> array of paragraphs. */
export const paragraphs = (str: string) => String(str || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

export const telHref = (phone: string) => 'tel:' + String(phone || '').replace(/[^+\d]/g, '');
