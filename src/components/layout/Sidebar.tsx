import { Building2, Cpu, Gauge, Landmark, ScrollText, Users } from 'lucide-react';
import { PAGES, type PageKey } from '../../lib/nav';
import type { Area } from '../../lib/selectors/alerts';
import { useApp } from '../../state/AppState';

const ICONS: Record<PageKey, typeof Gauge> = {
  overview: Gauge, finance: Landmark, investors: Users, issuers: Building2, technology: Cpu, governance: ScrollText,
};
const AREA: Partial<Record<PageKey, Area>> = {
  finance: 'Finance & Tranches', investors: 'Investors', issuers: 'Issuers', technology: 'Technology', governance: 'Governance',
};

export function Sidebar() {
  const { page, navigate, alerts } = useApp();
  return (
    <nav aria-label="Primary" className="flex h-full w-[232px] shrink-0 flex-col bg-rail text-rail-ink">
      <div className="px-5 pb-6 pt-6">
        <div className="font-display text-[22px] font-semibold tracking-tight">KLDX</div>
        <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-rail-muted">Management</div>
      </div>
      <ul className="flex flex-col gap-0.5 px-3">
        {PAGES.map((p) => {
          const Icon = ICONS[p.key];
          const area = AREA[p.key];
          const crit = area ? alerts.filter((a) => a.area === area && a.severity === 'Critical').length : 0;
          const high = area ? alerts.filter((a) => a.area === area && a.severity === 'High').length : 0;
          const active = page === p.key;
          return (
            <li key={p.key}>
              <button onClick={() => navigate({ page: p.key })} aria-current={active ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13.5px] transition-colors ${active ? 'bg-rail-hover font-semibold text-white' : 'text-rail-ink/85 hover:bg-rail-hover hover:text-white'}`}>
                <Icon size={17} strokeWidth={active ? 2.25 : 1.75} className={active ? 'text-accent' : 'text-rail-muted'} aria-hidden />
                <span className="flex-1 leading-tight">{p.label}</span>
                {crit > 0 && <span className="num rounded-full bg-crit px-1.5 text-[10.5px] font-semibold text-white" title={`${crit} critical alerts`}>{crit}<span className="sr-only"> critical</span></span>}
                {crit === 0 && high > 0 && <span className="num rounded-full bg-warn/90 px-1.5 text-[10.5px] font-semibold text-white" title={`${high} high alerts`}>{high}<span className="sr-only"> high</span></span>}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
