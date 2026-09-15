import type { Social } from '@/lib/data';
import { Icon } from '@/components/icons/sprite';
import { cn } from '@/lib/utils';

export function SocialLinks({ socials, className }: { socials: Social[]; className?: string }) {
  if (!socials.length) return null;
  return (
    <div className={cn('flex flex-wrap gap-2', className)} aria-label="Social media">
      {socials.map(x => (
        <a
          key={x.key}
          href={x.url}
          target="_blank"
          rel="noopener"
          aria-label={x.key}
          className="grid size-[40px] place-items-center rounded-full border border-border text-muted-foreground transition-[border-color,color,transform,box-shadow] duration-300 hover:-translate-y-[3px] hover:border-brand hover:text-brand hover:shadow-[0_10px_22px_-10px_var(--brand-glow)]"
        >
          <Icon name={x.key} className="size-[16px] stroke-[1.6]" />
        </a>
      ))}
    </div>
  );
}
