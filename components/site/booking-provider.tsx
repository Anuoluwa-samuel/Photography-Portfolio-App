'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { XIcon } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { EnquiryPanel } from '@/components/site/enquiry-form';
import { Accent } from '@/lib/text';

interface BookingContextValue {
  openBooking: (service?: string) => void;
}

const BookingContext = createContext<BookingContextValue | null>(null);

/** Open the booking popup from client code: `useBooking()?.openBooking('Wedding photography')`. */
export const useBooking = () => useContext(BookingContext);

/**
 * Site-wide "Book a session" popup.
 * Any element with a `data-book` attribute opens it (its value, if any, is the service to pre-select), so
 * server-rendered links keep a real href (`#contact`) as the no-JavaScript fallback. `/#book` opens it directly.
 */
export function BookingProvider({ services, title, intro, children }: { services: string[]; title: string; intro: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [service, setService] = useState<string>();

  const openBooking = useCallback((svc?: string) => {
    setService(svc);
    setOpen(true);
  }, []);

  const onOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next && window.location.hash === '#book') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // Let modified clicks (new tab, etc.) and already-handled clicks through.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const trigger = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-book]') : null;
      if (!trigger) return;
      e.preventDefault();
      openBooking(trigger.dataset.book || undefined);
    };
    const fromHash = () => {
      if (window.location.hash === '#book') openBooking();
    };
    fromHash();
    document.addEventListener('click', onClick);
    window.addEventListener('hashchange', fromHash);
    return () => {
      document.removeEventListener('click', onClick);
      window.removeEventListener('hashchange', fromHash);
    };
  }, [openBooking]);

  return (
    <BookingContext.Provider value={{ openBooking }}>
      {children}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="top-0 left-0 block h-dvh w-full max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-none border-0 bg-transparent p-0 shadow-none backdrop-filter-none sm:max-w-none"
          onPointerDown={e => {
            // Click outside the booking panel (on the blurred backdrop area) closes the popup.
            if (e.target instanceof Element && !e.target.closest('[data-booking-body], [data-slot=dialog-close]')) onOpenChange(false);
          }}
        >
          {/* Close stays reachable while the popup scrolls on small screens */}
          <div className="pointer-events-none sticky top-0 z-10 flex justify-end p-4 sm:p-6">
            <DialogClose
              aria-label="Close booking form"
              className="glass pointer-events-auto grid size-12 place-items-center rounded-full text-foreground transition-transform duration-300 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand [&_svg]:size-4"
            >
              <XIcon aria-hidden="true" />
            </DialogClose>
          </div>

          <div className="site-container -mt-[80px] flex min-h-dvh items-center py-20 sm:-mt-[96px]">
            <div data-booking-body className="mx-auto w-full max-w-3xl">
              <p className="eyebrow">Book a session</p>
              <DialogTitle className="display mt-2 text-[clamp(2rem,4.6vw,3.4rem)] font-normal leading-[1.02]">
                <Accent text={title} />
              </DialogTitle>
              <DialogDescription className="lead mb-10 mt-4 text-base">{intro}</DialogDescription>
              <EnquiryPanel services={services} initialService={service} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </BookingContext.Provider>
  );
}
