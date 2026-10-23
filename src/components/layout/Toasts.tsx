import { CheckCircle2, Info, X } from 'lucide-react';
import { useApp } from '../../state/AppState';

export function Toasts() {
  const { toasts, dispatch } = useApp();
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-5 right-5 z-[90] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto flex items-start gap-2.5 rounded-xl bg-rail px-4 py-3 text-[13px] text-rail-ink shadow-lift animate-rise">
          {t.tone === 'success' ? <CheckCircle2 size={17} className="mt-px shrink-0 text-accent" aria-hidden /> : <Info size={17} className="mt-px shrink-0 text-accent" aria-hidden />}
          <span className="flex-1 leading-snug">{t.text}</span>
          <button aria-label="Dismiss" onClick={() => dispatch({ type: 'dismissToast', id: t.id })} className="text-rail-muted hover:text-white"><X size={15} aria-hidden /></button>
        </div>
      ))}
    </div>
  );
}
