import type { CSSProperties } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Typed inline CSS custom properties, e.g. style={cssVars({ '--d': '.1s' })}. */
export const cssVars = (vars: Record<`--${string}`, string | number>) => vars as CSSProperties;
