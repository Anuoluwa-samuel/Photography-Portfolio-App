import { cn } from '@/lib/utils';

/**
 * Camera viewfinder corners inside a photo frame.
 *  - trigger="active": lock on when the nearest `group/slide` ancestor has data-active="true" (carousel slide in focus)
 *  - trigger="hover":  lock on when the nearest `group` ancestor is hovered or keyboard-focused
 */
export function ViewfinderCorners({ trigger, className }: { trigger: 'active' | 'hover'; className?: string }) {
  const base = 'absolute size-6 border-brand-bright opacity-0 transition-[opacity,translate] duration-500 ease-[var(--ease)] motion-reduce:transition-none';
  const on = trigger === 'active'
    ? 'group-data-[active=true]/slide:translate-x-0 group-data-[active=true]/slide:translate-y-0 group-data-[active=true]/slide:opacity-100'
    : 'group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:translate-y-0 group-focus-visible:opacity-100';

  return (
    <span aria-hidden="true" className={cn('pointer-events-none absolute inset-4 z-[2] sm:inset-6', className)}>
      <span className={cn(base, on, 'left-0 top-0 -translate-x-2 -translate-y-2 border-l-2 border-t-2')} />
      <span className={cn(base, on, 'right-0 top-0 translate-x-2 -translate-y-2 border-r-2 border-t-2')} />
      <span className={cn(base, on, 'bottom-0 left-0 -translate-x-2 translate-y-2 border-b-2 border-l-2')} />
      <span className={cn(base, on, 'bottom-0 right-0 translate-x-2 translate-y-2 border-b-2 border-r-2')} />
    </span>
  );
}
