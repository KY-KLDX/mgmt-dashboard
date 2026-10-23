import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useFocusTrap } from './Primitives';

export function Drawer({ open, title, eyebrow, onClose, children, headerExtra, width = 'max-w-[640px]' }: {
  open: boolean; title: ReactNode; eyebrow?: ReactNode; onClose: () => void; children: ReactNode; headerExtra?: ReactNode; width?: string;
}) {
  const ref = useFocusTrap(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-rail/30 animate-fadein" onMouseDown={onClose}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : 'Record detail'}
        onMouseDown={(e) => e.stopPropagation()}
        className={`flex h-full w-full ${width} flex-col border-l border-line bg-canvas shadow-lift animate-slidein`}>
        <header className="flex items-start justify-between gap-4 border-b border-line bg-surface px-6 py-4">
          <div className="min-w-0">
            {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
            <h2 className="font-display text-[21px] font-semibold leading-tight">{title}</h2>
            {headerExtra && <div className="mt-2 flex flex-wrap items-center gap-2">{headerExtra}</div>}
          </div>
          <button data-autofocus onClick={onClose} aria-label="Close panel" className="rounded-md p-1.5 text-ink-3 hover:bg-sunken hover:text-ink"><X size={18} aria-hidden /></button>
        </header>
        <div className="flex-1 space-y-5 overflow-y-auto scroll-thin px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function DrawerSection({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="eyebrow">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}
