import * as React from 'react';
import { cn } from '@/lib/utils';

type GlassCardProps = React.HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'article' | 'section' | 'aside';
  /** More opaque surface for dense content (forms, long text). */
  strong?: boolean;
};

/** Frosted-glass surface (21st.dev style): translucent fill, backdrop blur, hairline border and a diagonal sheen. */
function GlassCard({ as: Comp = 'div', strong, className, children, ...props }: GlassCardProps) {
  return (
    <Comp
      data-slot="glass-card"
      className={cn('glass relative overflow-hidden rounded-2xl [&>*:not([data-sheen])]:relative', strong && 'glass-strong', className)}
      {...props}
    >
      <span
        data-sheen
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(135deg,var(--glass-sheen),transparent_42%)]"
      />
      {children}
    </Comp>
  );
}

export { GlassCard };
