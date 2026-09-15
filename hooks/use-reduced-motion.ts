'use client';

import { useEffect, useState } from 'react';

/**
 * Live `prefers-reduced-motion` preference that is safe for hydration: `false` on the server and on the first client
 * render (so server and client markup always match), then the real value after mount and whenever it changes.
 * Use this instead of framer-motion's `useReducedMotion` wherever the value changes what is rendered.
 */
export function useReducedMotionPreference() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduce(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduce;
}
