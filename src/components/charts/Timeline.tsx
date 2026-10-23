import { addDays, AS_OF, daysFromAsOf } from '../../data/asOf';
import { dateShort } from '../../lib/format';
import type { TimelineEvent } from '../../lib/selectors/ops';

const RISK_COLOR: Record<string, string> = {
  Critical: 'rgb(var(--crit))',
  High: 'rgb(var(--warn))',
  Medium: 'rgb(var(--info))',
  Low: 'rgb(var(--mute))',
};

/**
 * Horizontal obligations timeline. Events are placed by days from the reporting date and
 * stacked into lanes so labels never overlap. Overdue items sit in a separate column on the left.
 */
export function ObligationTimeline({ events, overdue, horizon, onOpen }: {
  events: TimelineEvent[]; overdue: TimelineEvent[]; horizon: number; onOpen: (e: TimelineEvent) => void;
}) {
  const inRange = events.filter((e) => daysFromAsOf(e.date) >= 0 && daysFromAsOf(e.date) <= horizon);
  const LABEL_W = 23; // percentage width reserved for a label
  const lanes: number[] = [];
  const placed = inRange.map((e) => {
    const x = (daysFromAsOf(e.date) / horizon) * 100;
    const flip = x > 100 - LABEL_W;
    const start = flip ? x - LABEL_W : x;
    let lane = lanes.findIndex((end) => end <= start);
    if (lane === -1) { lane = lanes.length; lanes.push(-1); }
    lanes[lane] = flip ? x + 1 : x + LABEL_W;
    return { e, x, lane, flip };
  });
  const ticks = Array.from({ length: horizon / 15 + 1 }, (_, i) => i * 15);
  const laneH = 46;
  const h = Math.max(1, lanes.length) * laneH + 8;
  return (
    <div className="flex gap-4">
      <div className="w-56 shrink-0 rounded-lg border border-crit/30 bg-crit-soft/40 p-3">
        <div className="eyebrow mb-2 text-crit">Overdue ({overdue.length})</div>
        {overdue.length ? (
          <ul className="space-y-2">
            {overdue.map((e) => (
              <li key={e.id}>
                <button onClick={() => onOpen(e)} className="block w-full rounded-md text-left text-[12.5px] hover:underline">
                  <span className="font-medium">{e.title}</span>
                  <span className="num block text-[11.5px] text-crit">{-daysFromAsOf(e.date)} days overdue</span>
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="text-[12.5px] text-ink-3">Nothing overdue.</p>}
      </div>
      <div className="min-w-0 flex-1 overflow-x-auto">
        <div className="relative min-w-[720px]">
          <div className="relative mb-2 h-5 border-b border-line">
            {ticks.map((t) => (
              <span key={t} className={`num absolute whitespace-nowrap text-[11px] text-ink-3 ${t === 0 ? '' : t === horizon ? '-translate-x-full' : '-translate-x-1/2'}`} style={{ left: `${(t / horizon) * 100}%` }}>
                {t === 0 ? 'Today' : dateShort(addDays(AS_OF, t))}
              </span>
            ))}
          </div>
          <div className="relative" style={{ height: h }}>
            {ticks.map((t) => <span key={t} className="absolute inset-y-0 w-px bg-line/70" style={{ left: `${(t / horizon) * 100}%` }} aria-hidden />)}
            {placed.map(({ e, x, lane, flip }) => (
              <button key={e.id} onClick={() => onOpen(e)} title={`${e.title} · ${e.type} · ${dateShort(e.date)}`}
                className={`group absolute flex max-w-[23%] items-start gap-1.5 ${flip ? 'flex-row-reverse text-right' : 'text-left'}`}
                style={{ ...(flip ? { right: `${100 - x}%` } : { left: `${x}%` }), top: lane * laneH + 4, transform: flip ? 'translateX(5px)' : 'translateX(-5px)' }}>
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-surface" style={{ background: RISK_COLOR[e.risk] }} aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-medium group-hover:underline">{e.title}</span>
                  <span className="num block truncate text-[11px] text-ink-3">{dateShort(e.date)} · {e.type} · {e.risk}</span>
                </span>
              </button>
            ))}
            {!placed.length && <p className="pt-4 text-center text-[13px] text-ink-3">No events in the next {horizon} days.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
