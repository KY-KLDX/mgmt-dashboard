import { CheckCheck, ChevronDown, ChevronRight, X } from 'lucide-react';
import { useState } from 'react';
import { bucketOf, type Alert, type Bucket } from '../../lib/selectors/alerts';
import { useApp } from '../../state/AppState';
import { useFocusTrap } from '../ui/Primitives';

const GROUPS: { key: Bucket; label: string; tone: string }[] = [
  { key: 'overdue', label: 'Overdue', tone: 'text-crit' },
  { key: 'week', label: 'This week', tone: 'text-warn' },
  { key: 'watch', label: 'Watching', tone: 'text-ink-3' },
];

const DOT: Record<string, string> = { Critical: 'bg-crit', High: 'bg-warn', Medium: 'bg-info', Low: 'bg-mute', Informational: 'bg-mute' };
const CHIP: Record<Bucket, string> = { overdue: 'bg-crit-soft text-crit', week: 'bg-warn-soft text-warn', watch: 'bg-sunken text-ink-2' };

/**
 * Notification panel built for skimming: three urgency groups, a 2–4 word headline per item
 * and one status chip. Only "Overdue" is expanded when it opens.
 */
export function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const { alerts, seen, dispatch, navigate } = useApp();
  const [open, setOpen] = useState<Record<Bucket, boolean>>({ overdue: true, week: false, watch: false });
  const ref = useFocusTrap(true, onClose);
  const items = alerts.map((a) => ({ a, ...bucketOf(a) }));
  const unseen = alerts.filter((a) => !seen.includes(a.id)).length;

  const go = (a: Alert) => {
    dispatch({ type: 'markSeen', ids: [a.id] });
    navigate(a.link);
  };

  return (
    <div className="fixed inset-0 z-[70]" onMouseDown={onClose}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label="Notifications" onMouseDown={(e) => e.stopPropagation()}
        className="absolute right-4 top-16 flex max-h-[calc(100vh-5rem)] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-lift animate-rise">
        <header className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
          <h2 className="font-display text-[19px] font-semibold">Needs attention</h2>
          <button onClick={onClose} aria-label="Close notifications" className="rounded-md p-1 text-ink-3 hover:bg-sunken hover:text-ink"><X size={18} aria-hidden /></button>
        </header>

        <div className="flex-1 overflow-y-auto scroll-thin px-2 pb-2">
          {GROUPS.map((g) => {
            const rows = items.filter((x) => x.bucket === g.key);
            if (!rows.length) return null;
            const isOpen = open[g.key];
            return (
              <section key={g.key} className="mb-1">
                <button onClick={() => setOpen({ ...open, [g.key]: !isOpen })} aria-expanded={isOpen}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left hover:bg-sunken">
                  {isOpen ? <ChevronDown size={16} className="text-ink-3" aria-hidden /> : <ChevronRight size={16} className="text-ink-3" aria-hidden />}
                  <span className={`text-[12px] font-bold uppercase tracking-[0.1em] ${g.tone}`}>{g.label}</span>
                  <span className="num text-[12px] font-semibold text-ink-3">· {rows.length}</span>
                </button>
                {isOpen && (
                  <ul>
                    {rows.map(({ a, chip }) => {
                      const isNew = !seen.includes(a.id);
                      return (
                        <li key={a.id}>
                          <button onClick={() => go(a)} title={a.title} aria-label={`${a.severity}: ${a.title}. ${chip}.`}
                            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-sunken ${isNew ? '' : 'opacity-60'}`}>
                            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[a.severity]}`} aria-hidden />
                            <span className={`min-w-0 flex-1 truncate text-[14px] ${isNew ? 'font-semibold' : 'font-medium'}`}>{a.headline}</span>
                            <span className={`num shrink-0 rounded-md px-2 py-0.5 text-[12px] font-semibold ${CHIP[g.key]}`}>{chip}</span>
                            <ChevronRight size={15} className="shrink-0 text-ink-3" aria-hidden />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>

        <footer className="flex items-center justify-between border-t border-line px-5 py-3">
          <span className="text-[12px] text-ink-3">{unseen ? `${unseen} new` : 'All caught up'}</span>
          <button onClick={() => dispatch({ type: 'markSeen', ids: alerts.map((a) => a.id) })} disabled={!unseen}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-accent hover:bg-accent-soft disabled:opacity-40">
            <CheckCheck size={15} aria-hidden /> Mark all as seen
          </button>
        </footer>
      </div>
    </div>
  );
}
