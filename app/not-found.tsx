import type { Metadata } from 'next';
import { ThemeToggle } from '@/components/theme-toggle';
import { ActionButton } from '@/components/ui/action-button';

export const metadata: Metadata = { title: 'Page not found' };

// The sonar dot field comes from the site-wide layer in app/layout.tsx.
export default function NotFound() {
  return (
    <>
      <ThemeToggle className="fixed right-5 top-5 z-10" />
      <main className="site-container grid min-h-screen place-items-center text-center">
        <div>
          <p className="eyebrow">404</p>
          <h1 className="display">That frame <em>isn&apos;t</em> here</h1>
          <p className="lead mx-auto mb-10 mt-6">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
          <ActionButton href="/">Back to the portfolio</ActionButton>
        </div>
      </main>
    </>
  );
}
