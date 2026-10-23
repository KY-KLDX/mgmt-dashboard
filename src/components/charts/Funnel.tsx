import { pct } from '../../lib/format';
import type { FunnelStage } from '../../lib/selectors/investors';

/** Investor lifecycle funnel: horizontal bars scaled to the registered count. */
export function Funnel({ stages, selected, onSelect }: { stages: FunnelStage[]; selected: string | null; onSelect: (s: string | null) => void }) {
  const max = Math.max(1, stages[0].count);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-[12.5px]">
        <caption className="sr-only">Investor lifecycle funnel</caption>
        <thead>
          <tr className="text-[11.5px] text-ink-3">
            <th scope="col" className="w-44 pb-2 text-left font-medium">Stage</th>
            <th scope="col" className="pb-2 text-left font-medium">Investors</th>
            <th scope="col" className="w-24 pb-2 text-right font-medium">From previous</th>
            <th scope="col" className="w-24 pb-2 text-right font-medium">From registered</th>
            <th scope="col" className="w-20 pb-2 text-right font-medium">Drop-off</th>
            <th scope="col" className="w-24 pb-2 text-right font-medium">Median days</th>
          </tr>
        </thead>
        <tbody>
          {stages.map((s, k) => {
            const active = selected === s.stage;
            const prevCount = k > 0 ? stages[k - 1].count : 0;
            const weak = s.fromPrev !== null && prevCount > 0 && s.fromPrev < 0.8;
            return (
              <tr key={s.stage} className={active ? 'bg-accent-soft/60' : ''}>
                <th scope="row" className="py-1.5 pr-3 text-left font-medium">
                  <span className="num mr-1.5 text-ink-3">{k + 1}</span>{s.stage}
                </th>
                <td className="py-1.5 pr-3">
                  <button onClick={() => onSelect(active ? null : s.stage)} aria-pressed={active} aria-label={`${s.stage}: ${s.count} investors. Show drop-offs.`}
                    className="group flex w-full items-center gap-2">
                    <span className="relative h-6 flex-1 overflow-hidden rounded bg-sunken">
                      <span className={`absolute inset-y-0 left-0 rounded transition-opacity ${active ? 'opacity-100' : 'opacity-85 group-hover:opacity-100'}`}
                        style={{ width: `${(s.count / max) * 100}%`, background: 'var(--series-1)' }} />
                    </span>
                    <span className="num w-8 text-right font-semibold">{s.count}</span>
                  </button>
                </td>
                <td className={`num py-1.5 text-right ${weak ? 'font-semibold text-warn' : 'text-ink-2'}`}>{s.fromPrev === null || prevCount === 0 ? '—' : pct(s.fromPrev, 0)}</td>
                <td className="num py-1.5 text-right text-ink-2">{pct(s.fromStart, 0)}</td>
                <td className="num py-1.5 text-right text-ink-2">{k === stages.length - 1 ? '—' : s.dropOff}</td>
                <td className="num py-1.5 text-right text-ink-2">{s.medianDays === null ? '—' : s.medianDays.toFixed(1)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
