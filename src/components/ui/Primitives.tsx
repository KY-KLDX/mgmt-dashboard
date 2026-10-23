import { AlertCircle, Info, RefreshCw, SearchX, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

export function Card({ title, subtitle, actions, children, className = '', bodyClass = 'p-5', id }: {
  title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClass?: string; id?: string;
}) {
  return (
    <section id={id} className={`card min-w-0 ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[12.5px] text-ink-3">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

export function Button({ children, onClick, variant = 'secondary', size = 'md', icon, type = 'button', disabled, ariaLabel, className = '' }: {
  children?: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md';
  icon?: ReactNode; type?: 'button' | 'submit'; disabled?: boolean; ariaLabel?: string; className?: string;
}) {
  const v = {
    primary: 'bg-accent text-white hover:bg-accent-ink border-transparent',
    secondary: 'bg-surface text-ink border-line hover:bg-sunken',
    ghost: 'bg-transparent text-ink-2 border-transparent hover:bg-sunken hover:text-ink',
    danger: 'bg-crit text-white border-transparent hover:opacity-90',
  }[variant];
  const s = size === 'sm' ? 'h-8 px-2.5 text-[12.5px]' : 'h-9 px-3.5 text-[13px]';
  return (
    <button type={type} onClick={onClick} disabled={disabled} aria-label={ariaLabel}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${v} ${s} ${className}`}>
      {icon}
      {children}
    </button>
  );
}

export function InfoTip({ text, label = 'More information', wide = false }: { text: ReactNode; label?: string; wide?: boolean }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="relative inline-flex">
      <button type="button" aria-label={label} aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="rounded-full text-ink-3 hover:text-ink">
        <Info size={14} aria-hidden />
      </button>
      {open && (
        <span role="tooltip" id={id}
          className={`absolute left-1/2 top-6 z-50 -translate-x-1/2 rounded-lg bg-rail px-3 py-2 text-left text-[12px] font-normal normal-case leading-relaxed tracking-normal text-rail-ink shadow-lift animate-fadein ${wide ? 'w-80' : 'w-64'}`}>
          {text}
        </span>
      )}
    </span>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

export function EmptyState({ title, body, action, icon }: { title: string; body?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <div className="text-ink-3">{icon ?? <SearchX size={26} aria-hidden />}</div>
      <p className="font-medium text-ink">{title}</p>
      {body && <p className="max-w-sm text-[13px] text-ink-3">{body}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export function ErrorState({ title, body, onRetry }: { title: string; body: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-2 rounded-lg border border-crit/30 bg-crit-soft/60 p-4">
      <p className="flex items-center gap-2 font-medium text-crit"><AlertCircle size={16} aria-hidden /> {title}</p>
      <p className="text-[13px] text-ink-2">{body}</p>
      {onRetry && <Button size="sm" onClick={onRetry} icon={<RefreshCw size={13} aria-hidden />}>Retry</Button>}
    </div>
  );
}

export function Progress({ value, tone = 'accent', label }: { value: number; tone?: 'accent' | 'crit' | 'warn' | 'good' | 'mute'; label?: string }) {
  const bg = { accent: 'bg-accent', crit: 'bg-crit', warn: 'bg-warn', good: 'bg-good', mute: 'bg-mute' }[tone];
  const w = Math.max(0, Math.min(100, value * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={`h-full rounded-full ${bg}`} style={{ width: `${w}%` }} />
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: { key: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-1 rounded-lg bg-sunken p-1">
      {tabs.map((t) => (
        <button key={t.key} role="tab" aria-selected={value === t.key} onClick={() => onChange(t.key)}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${value === t.key ? 'bg-surface text-ink shadow-card' : 'text-ink-2 hover:text-ink'}`}>
          {t.label}
          {t.count !== undefined && <span className={`num rounded-full px-1.5 text-[11px] ${value === t.key ? 'bg-accent-soft text-accent-ink' : 'bg-line/70 text-ink-3'}`}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Select({ label, value, onChange, options, id, hideLabel = false }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; id: string; hideLabel?: boolean;
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1">
      <span className={hideLabel ? 'sr-only' : 'text-[11px] font-medium text-ink-3'}>{label}</span>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}
        className="h-8 min-w-[8rem] rounded-lg border border-line bg-surface px-2 text-[12.5px] text-ink focus:border-accent">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function SearchInput({ value, onChange, placeholder, id }: { value: string; onChange: (v: string) => void; placeholder: string; id: string }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-ink-3">Search</span>
      <input id={id} type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="h-8 w-56 rounded-lg border border-line bg-surface px-2.5 text-[12.5px] text-ink placeholder:text-ink-3 focus:border-accent" />
    </label>
  );
}

export function Chips({ chips, onClear }: { chips: { key: string; label: string; onRemove: () => void }[]; onClear: () => void }) {
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
      {chips.map((c) => (
        <span key={c.key} className="inline-flex items-center gap-1 rounded-full bg-accent-soft py-0.5 pl-2.5 pr-1 text-[12px] font-medium text-accent-ink">
          {c.label}
          <button aria-label={`Remove filter ${c.label}`} onClick={c.onRemove} className="rounded-full p-0.5 hover:bg-accent/15"><X size={12} aria-hidden /></button>
        </span>
      ))}
      <button onClick={onClear} className="text-[12px] font-medium text-ink-2 underline-offset-2 hover:text-ink hover:underline">Clear filters</button>
    </div>
  );
}

export function useFocusTrap(active: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!active) return;
    const prev = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const focusables = () => Array.from(node?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? []).filter((e) => !e.hasAttribute('disabled'));
    window.setTimeout(() => (node?.querySelector<HTMLElement>('[data-autofocus]') ?? focusables()[0])?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      if (e.key === 'Tab') {
        const f = focusables();
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    };
    node?.addEventListener('keydown', onKey);
    return () => { node?.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, [active, onClose]);
  return ref;
}

export function Modal({ open, title, onClose, children, footer, width = 'max-w-xl' }: {
  open: boolean; title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; width?: string;
}) {
  const ref = useFocusTrap(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-rail/40 px-4 py-[8vh] backdrop-blur-[2px] animate-fadein" onMouseDown={onClose}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}
        className={`card w-full ${width} animate-rise shadow-lift`} onMouseDown={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-ink-3 hover:bg-sunken hover:text-ink"><X size={18} aria-hidden /></button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto scroll-thin px-5 py-4">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11.5px] text-ink-3">{label}</dt>
      <dd className="mt-0.5 text-[13px] text-ink">{children}</dd>
    </div>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-2 mt-1 flex items-center justify-between gap-2">
      <h3 className="eyebrow">{children}</h3>
      {aside}
    </div>
  );
}
