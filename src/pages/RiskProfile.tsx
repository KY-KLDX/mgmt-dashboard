import { ChevronRight, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { Panel } from '../components/ui/Showcase';
import { INVESTORS } from '../data/investors';
import { riskProfileFor, type RiskLevel3 } from '../data/riskProfiles';
import { pct } from '../lib/format';
import { investorLabel } from '../lib/identity';

const LEVELS: { level: RiskLevel3; color: string; key: string }[] = [
  { level: 'Low', color: 'rgb(var(--accent) / 0.22)', key: 'risk:low' },
  { level: 'Medium', color: 'rgb(var(--accent) / 0.55)', key: 'risk:medium' },
  { level: 'High', color: 'rgb(var(--accent))', key: 'risk:high' },
];

/** Synthetic AML/CDD risk distribution; High-risk investors awaiting review are listed for follow-up. */
export function RiskProfileCard({ onFilter, onOpen }: { onFilter: (key: string) => void; onOpen: (id: string) => void }) {
  const [hover, setHover] = useState<RiskLevel3 | null>(null);
  const profiles = INVESTORS.map((i) => ({ inv: i, r: riskProfileFor(i.id) }));
  const data = LEVELS.map((l) => ({ ...l, n: profiles.filter((p) => p.r.level === l.level).length }));
  const total = profiles.length;
  const pending = profiles.filter((p) => p.r.review === 'Pending review');

  return (
    <Panel icon={ShieldAlert} title="Risk profile"
      info="Synthetic AML/CDD rating from PEP connection, high-risk jurisdiction, unclear source of funds and complex ownership. High-risk investors need an enhanced review. Illustrative only: not KLDX's risk methodology.">
      <div className="flex flex-1 flex-col gap-4 px-6 pb-5">
        <div className="flex items-center gap-5">
          <button onClick={() => onFilter('risk:review')} aria-label={`${pending.length} investors need manual review. Show them in the table.`}
            className="relative h-[150px] w-[150px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="n" nameKey="level" innerRadius="72%" outerRadius="98%" startAngle={90} endAngle={-270}
                  stroke="rgb(var(--surface))" strokeWidth={2} isAnimationActive={false}
                  onMouseEnter={(_, i) => setHover(data[i].level)} onMouseLeave={() => setHover(null)}>
                  {data.map((d) => <Cell key={d.level} fill={d.color} fillOpacity={hover && hover !== d.level ? 0.25 : 1} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <span className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <span>
                <span className={`num block font-display text-[32px] font-semibold leading-none ${pending.length ? 'text-crit' : ''}`}>{pending.length}</span>
                <span className="mt-1 block text-[12px] leading-tight text-ink-2">need<br />review</span>
              </span>
            </span>
          </button>
          <ul className="min-w-0 flex-1 divide-y divide-line">
            {data.map((d) => (
              <li key={d.level}>
                <button onClick={() => onFilter(d.key)} onMouseEnter={() => setHover(d.level)} onMouseLeave={() => setHover(null)}
                  className={`-mx-2 flex w-[calc(100%+1rem)] items-center gap-2.5 rounded-lg px-2 py-2 text-left ${hover === d.level ? 'bg-sunken' : ''}`}>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} aria-hidden />
                  <span className="flex-1 text-[13px]">{d.level}</span>
                  <span className="num font-display text-[18px] font-semibold">{d.n}</span>
                  <span className="num w-9 text-right text-[12px] text-ink-3">{pct(d.n / total, 0)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-1 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">Awaiting review</div>
          {pending.length ? (
            <ul className="divide-y divide-line">
              {pending.map(({ inv, r }) => (
                <li key={inv.id}>
                  <button onClick={() => onOpen(inv.id)} title={r.factors.join(' · ')} className="flex w-full items-center gap-2 py-2 text-left hover:opacity-80">
                    <span className="num min-w-0 flex-1 truncate text-[13px] font-semibold">{investorLabel(inv)}</span>
                    <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-white">High</span>
                    <ChevronRight size={14} className="shrink-0 text-ink-3" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="text-[13px] text-ink-3">No high-risk reviews pending.</p>}
        </div>
      </div>
    </Panel>
  );
}
