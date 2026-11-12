import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { INVESTORS } from '../../data/investors';
import { date, rm } from '../../lib/format';
import { activityIn, type ActivityTab } from '../../lib/selectors/activity';
import { resolveInvestorList } from '../../lib/selectors/investorLists';
import { investorShortLabel } from '../../lib/identity';
import { allInvestorMetrics } from '../../lib/selectors/investors';
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
    const rows = activityIn(period, tab).filter((e) => !q || investorShortLabel(INVESTORS.find((i) => i.id === e.investorId)!).toLowerCase().includes(q.toLowerCase()));
    return (
      <Drawer open onClose={onClose} title="Investor activity" eyebrow={period.label} width="max-w-[760px]">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs label="Activity type" value={tab} onChange={setTab} tabs={ACTIVITY_TABS} />
          <label htmlFor="act-q" className="sr-only">Filter by investor</label>
          <input id="act-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by ID or initials" className="h-9 flex-1 rounded-lg border border-line bg-surface px-3 text-[13px]" />
        </div>
        <div className="card divide-y divide-line">
          {rows.length ? rows.map((e) => <ActivityRow key={e.id} e={e} onOpen={() => openDrawer({ kind: 'investor', id: e.investorId })} />)
            : <EmptyState title="No activity" body="Nothing matches in this period." />}
        </div>
      </Drawer>
    );
  }

  const metrics = allInvestorMetrics();
  const { title, ids } = resolveInvestorList(id, { thresholds, bands: bandCfg, period });
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
