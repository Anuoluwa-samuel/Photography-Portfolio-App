'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

/** Light / dark switch. Icons swap via the `dark` class, so there is no hydration flash. */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className={cn(
        'glass relative grid size-10 shrink-0 place-items-center rounded-full text-foreground',
        'transition-transform duration-300 hover:scale-105 active:scale-95',
        className,
      )}
    >
      <Sun className="size-[16px] rotate-0 scale-100 transition-transform duration-500 dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute size-[16px] rotate-90 scale-0 transition-transform duration-500 dark:rotate-0 dark:scale-100" />
    </button>
  );
}
