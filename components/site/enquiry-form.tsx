'use client';

import { useEffect, useId, useState, type FocusEvent, type FormEvent, type ReactNode } from 'react';
import { CalendarDays, Camera, Mail, MessageSquare, Phone, UserRound } from 'lucide-react';
import { ActionButton } from '@/components/ui/action-button';
import { BokehBackground } from '@/components/ui/bokeh-background';
import { FloatingField } from '@/components/ui/floating-field';
import { GlassCard } from '@/components/ui/glass-card';
import { cn } from '@/lib/utils';

type FieldName = 'name' | 'email' | 'phone' | 'service' | 'date' | 'message';
type Values = Record<FieldName, string>;
type Errors = Partial<Record<FieldName, string>>;

const EMPTY: Values = { name: '', email: '', phone: '', service: '', date: '', message: '' };
const FIELD_ORDER: FieldName[] = ['name', 'email', 'phone', 'service', 'date', 'message'];
const RULES: Record<FieldName, (v: string) => true | string> = {
  name: v => v.trim().length >= 2 || 'Enter your name.',
  email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || 'Enter a valid email address.',
  phone: v => !v.trim() || /^[+\d][\d\s()-]{6,}$/.test(v.trim()) || 'Enter a valid phone number, or leave it blank.',
  service: v => !!v || 'Choose the type of photography.',
  date: v => !v || new Date(v) >= new Date(new Date().toDateString()) || "Choose a date that hasn't passed.",
  message: v => v.trim().length >= 10 || 'Add a little detail so I can send an accurate quote.',
};

/**
 * "Book <service>" link on a service card. With JavaScript it opens the booking popup with the service
 * pre-selected (see BookingProvider's `data-book`); without it, it still jumps to the contact section.
 */
export function BookServiceLink({ service, className, children }: { service: string; className?: string; children: ReactNode }) {
  return (
    <ActionButton href="#contact" variant="link" className={className} data-book={service}>
      {children}
    </ActionButton>
  );
}

export function EnquiryForm({
  services, initialService, onFocusChange,
}: { services: string[]; initialService?: string; onFocusChange?: (focused: boolean) => void }) {
  const uid = useId(); // unique field ids, so the form can appear more than once on a page (section + popup)
  const [values, setValues] = useState<Values>(() => ({
    ...EMPTY,
    service: initialService && services.includes(initialService) ? initialService : '',
  }));
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [minDate, setMinDate] = useState<string>();

  useEffect(() => {
    setMinDate(new Date().toISOString().slice(0, 10)); // earliest selectable date = today (client clock)
  }, []);

  const validate = (name: FieldName, value = values[name]) => {
    const r = RULES[name](value);
    setErrors(prev => ({ ...prev, [name]: r === true ? undefined : r }));
    return r === true;
  };

  const bind = (name: FieldName) => ({
    id: `${uid}-${name}`,
    name,
    value: values[name],
    error: errors[name],
    onBlur: () => validate(name),
    onChange: (e: { target: { value: string } }) => {
      const value = e.target.value;
      setValues(v => ({ ...v, [name]: value }));
      if (errors[name]) validate(name, value);
    },
  });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    const form = e.currentTarget;
    if (new FormData(form).get('company')) return; // honeypot tripped

    const found: Errors = {};
    FIELD_ORDER.forEach(k => { const r = RULES[k](values[k]); if (r !== true) found[k] = r; });
    setErrors(found);
    const firstBad = FIELD_ORDER.find(k => found[k]);
    if (firstBad) { (form.elements.namedItem(firstBad) as HTMLElement | null)?.focus(); return; }

    setSending(true);
    try {
      const res = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(values),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (body.fields) setErrors(body.fields);
        throw new Error(body.message || 'bad response');
      }
      setStatus({ kind: 'ok', text: `Thanks, ${values.name.trim().split(' ')[0]}. Your enquiry is in — expect a reply within one working day.` });
      setValues(EMPTY);
      setErrors({});
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setStatus({
        kind: 'err',
        text: msg && !/bad response|fetch/i.test(msg) ? msg : "The message didn't send. Check your connection and try again, or use the email address on the left.",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      onFocus={() => onFocusChange?.(true)}
      onBlur={(e: FocusEvent<HTMLFormElement>) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onFocusChange?.(false);
      }}
    >
      <div className="grid grid-cols-2 gap-x-8 max-[600px]:grid-cols-1">
        <FloatingField {...bind('name')} label="Name" icon={<UserRound />} type="text" autoComplete="name" required />
        <FloatingField {...bind('email')} label="Email" icon={<Mail />} type="email" autoComplete="email" required />
      </div>
      <div className="grid grid-cols-2 gap-x-8 max-[600px]:grid-cols-1">
        <FloatingField {...bind('phone')} label="Phone" hint="optional" icon={<Phone />} type="tel" autoComplete="tel" />
        <FloatingField as="select" {...bind('service')} label="Type of photography" icon={<Camera />} required>
          <option value="">Choose a service</option>
          {services.map(name => <option key={name}>{name}</option>)}
          <option>Something else</option>
        </FloatingField>
      </div>
      <FloatingField {...bind('date')} label="Preferred date" hint="optional" icon={<CalendarDays />} type="date" min={minDate} />
      <FloatingField as="textarea" {...bind('message')} label="Project details" icon={<MessageSquare />} required />
      <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px]" />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <ActionButton type="submit" loading={sending}>
          {sending ? 'Sending' : 'Send enquiry'}
        </ActionButton>
        <small className="text-[.78rem] text-dim">No deposit needed to enquire.</small>
      </div>
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'mt-[16px] hidden rounded-lg px-[16px] py-4 text-[.92rem] leading-normal',
          status?.kind === 'ok' && 'block border border-brand/40 bg-brand-soft text-brand',
          status?.kind === 'err' && 'block border border-danger/40 bg-danger/10 text-danger',
        )}
      >
        {status?.text}
      </div>
    </form>
  );
}

/** The enquiry form on a glass panel, with bokeh that racks into focus while the visitor is filling it in. */
export function EnquiryPanel({ services, initialService, className }: { services: string[]; initialService?: string; className?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <BokehBackground focus={focused ? 1 : 0} className={cn('-m-4 rounded-[32px] p-4 sm:-m-8 sm:p-8 lg:-m-12 lg:p-12', className)}>
      <GlassCard className="rounded-[20px] p-[clamp(24px,4vw,48px)]">
        <EnquiryForm services={services} initialService={initialService} onFocusChange={setFocused} />
      </GlassCard>
    </BokehBackground>
  );
}
