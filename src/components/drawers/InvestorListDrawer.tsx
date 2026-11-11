import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { INVESTORS } from '../../data/investors';
import { date, rm } from '../../lib/format';
import { activityIn, investorExceptions, type ActivityTab } from '../../lib/selectors/activity';
import { FUNNEL_STAGES, allInvestorMetrics, bands, funnel, isCtosIncomplete, isKycIncomplete } from '../../lib/selectors/investors';
import { useApp } from '../../state/AppState';
import { StatusBadge } from '../ui/Badge';
import { Drawer } from '../ui/Drawer';
import { EmptyState, Tabs } from '../ui/Primitives';
import { ActivityRow, ACTIVITY_TABS } from '../ui/ActivityRow';

/**
 * Lists of investors (or activity) opened from charts, exceptions and links.
 * Keys: group:<active|idle|pending>, onboarding, band:<n>, funnel:<stage index>:<period|all>,
 * exception:<key>, activity:all.
 */
export function InvestorListDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { thresholds, bands: bandCfg, period, openDrawer } = useApp();
  const [tab, setTab] = useState<ActivityTab>('all');
  const [q, setQ] = useState('');

  if (id === 'activity:all') {
    const rows = activityIn(period, tab).filter((e) => !q || INVESTORS.find((i) => i.id === e.investorId)!.name.toLowerCase().includes(q.toLowerCase()));
    return (
      <Drawer open onClose={onClose} title="Investor activity" eyebrow={period.label} width="max-w-[760px]">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs label="Activity type" value={tab} onChange={setTab} tabs={ACTIVITY_TABS} />
          <label htmlFor="act-q" className="sr-only">Filter by investor</label>
          <input id="act-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by investor" className="h-9 flex-1 rounded-lg border border-line bg-surface px-3 text-[13px]" />
        </div>
        <div className="card divide-y divide-line">
          {rows.length ? rows.map((e) => <ActivityRow key={e.id} e={e} onOpen={() => openDrawer({ kind: 'investor', id: e.investorId })} />)
            : <EmptyState title="No activity" body="Nothing matches in this period." />}
        </div>
      </Drawer>
    );
  }

  const metrics = allInvestorMetrics();
  let title = 'Investors';
  let ids: string[] = [];
  if (id.startsWith('group:')) {
    const g = id.slice(6);
    title = g === 'active' ? 'Active investors' : g === 'idle' ? 'Approved, not invested' : 'Not yet verified';
    ids = metrics.filter((m) => (g === 'active' ? m.currentCount > 0 : g === 'idle' ? m.currentCount === 0 && !!m.inv.approvedOn : !m.inv.approvedOn)).map((m) => m.inv.id);
  } else if (id === 'onboarding') {
    title = 'Onboarding incomplete';
    ids = INVESTORS.filter((i) => isCtosIncomplete(i) || isKycIncomplete(i)).map((i) => i.id);
  } else if (id.startsWith('band:')) {
    const b = bands(bandCfg)[Number(id.slice(5))];
    title = b ? `Value band: ${b.label}` : 'Value band';
    ids = b?.ids ?? [];
  } else if (id.startsWith('funnel:')) {
    const [, k, cohort] = id.split(':');
    const f = funnel(cohort === 'all' ? null : period);
    const n = Number(k);
    const next = new Set(f[n + 1]?.ids ?? []);
    title = `Stopped at: ${FUNNEL_STAGES[n]}`;
    ids = f[n].ids.filter((x) => n === f.length - 1 || !next.has(x));
  } else if (id.startsWith('exception:')) {
    const all = investorExceptions(thresholds);
    const ex = all.find((e) => e.key === id.slice(10));
    title = ex?.title ?? 'All exceptions';
    ids = ex ? ex.ids : [...new Set(all.flatMap((e) => e.ids))];
  }
  const rows = metrics.filter((m) => ids.includes(m.inv.id)).sort((a, b) => b.current - a.current);

  return (
    <Drawer open onClose={onClose} title={title} eyebrow={`${rows.length} investor${rows.length === 1 ? '' : 's'}`} width="max-w-[640px]">
      <ul className="card divide-y divide-line">
        {rows.map((m) => (
          <li key={m.inv.id}>
            <button onClick={() => openDrawer({ kind: 'investor', id: m.inv.id })} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-sunken">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold">{m.inv.name}</span>
                <span className="block truncate text-[12px] text-ink-3">{m.inv.id} · last activity {date(m.inv.lastActivity)}</span>
              </span>
              <span className="num shrink-0 text-right text-[13px]">{m.current ? rm(m.current) : '—'}</span>
              <StatusBadge status={m.inv.accountStatus} />
              <ChevronRight size={15} className="shrink-0 text-ink-3" aria-hidden />
            </button>
          </li>
        ))}
        {!rows.length && <li><EmptyState title="No investors in this list" /></li>}
      </ul>
    </Drawer>
  );
}
