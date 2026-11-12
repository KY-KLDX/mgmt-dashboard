import { Users } from 'lucide-react';
import { useState } from 'react';
import { StatusBadge } from '../components/ui/Badge';
import { DataTable, type Column } from '../components/ui/DataTable';
import { Chips, SearchInput, Select, Tabs } from '../components/ui/Primitives';
import { Panel } from '../components/ui/Showcase';
import { PROFILE_CHANGES } from '../data/profileChanges';
import { date, rm } from '../lib/format';
import { resolveInvestorList } from '../lib/selectors/investorLists';
import { allInvestorMetrics, bandIndex, bands, isCtosIncomplete, isKycIncomplete, onboardingAge, type InvestorMetrics } from '../lib/selectors/investors';
import { useApp } from '../state/AppState';

type Tab = 'current' | 'deposits' | 'wallet';
const SORT: Record<Tab, string> = { current: 'cur', deposits: 'dep', wallet: 'wal' };

/** Pending profile changes that need a human check before money moves. */
const pendingReview = new Map(PROFILE_CHANGES.filter((c) => c.status === 'Pending review').map((c) => [c.investorId, c]));

/**
 * The full investor list. Chart, funnel and exception clicks above set `listKey`, which
 * narrows the table to those investors and shows a removable filter chip.
 */
export function InvestorTable({ listKey, onClearList }: { listKey: string; onClearList: () => void }) {
  const { thresholds, bands: bandCfg, period, openDrawer } = useApp();
  const [tab, setTab] = useState<Tab>('current');
  const [q, setQ] = useState('');
  const [band, setBand] = useState('');
  const [ctos, setCtos] = useState('');
  const [kyc, setKyc] = useState('');
  const bandRows = bands(bandCfg);
  const list = listKey ? resolveInvestorList(listKey, { thresholds, bands: bandCfg, period }) : null;

  let rows: InvestorMetrics[] = allInvestorMetrics();
  if (list) rows = rows.filter((m) => list.ids.includes(m.inv.id));
  else if (tab === 'current') rows = rows.filter((m) => m.currentCount > 0);
  else if (tab === 'deposits') rows = rows.filter((m) => m.deposits > 0);
  else rows = rows.filter((m) => m.wallet > 0);
  if (band) rows = rows.filter((m) => m.currentCount > 0 && bandIndex(m.current, bandCfg) === Number(band));
  if (ctos) rows = rows.filter((m) => m.inv.ctos === ctos);
  if (kyc) rows = rows.filter((m) => m.inv.kyc === kyc);
  if (q) rows = rows.filter((m) => m.inv.id.toLowerCase().includes(q.toLowerCase()));

  const chips = [
    list && { key: 'list', label: list.title, onRemove: onClearList },
    band && { key: 'band', label: `Band ${bandRows[Number(band)]?.short}`, onRemove: () => setBand('') },
    ctos && { key: 'ctos', label: `CTOS ${ctos.toLowerCase()}`, onRemove: () => setCtos('') },
    kyc && { key: 'kyc', label: `KYC ${kyc.toLowerCase()}`, onRemove: () => setKyc('') },
    q && { key: 'q', label: `“${q}”`, onRemove: () => setQ('') },
  ].filter(Boolean) as { key: string; label: string; onRemove: () => void }[];

  const columns: Column<InvestorMetrics>[] = [
    { key: 'name', header: 'Investor ID', render: (m) => (
      <span className="whitespace-nowrap font-medium">{m.inv.id}<span className="block text-[11.5px] font-normal text-ink-3">{m.inv.type}</span></span>
    ), sort: (m) => m.inv.id },
    { key: 'cur', header: 'Current subscriptions', align: 'right', render: (m) => rm(m.current), sort: (m) => m.current },
    { key: 'dep', header: 'Lifetime deposits', align: 'right', render: (m) => rm(m.deposits), sort: (m) => m.deposits },
    { key: 'alloc', header: 'Allocated (lifetime)', align: 'right', render: (m) => rm(m.lifetimeAllocated), sort: (m) => m.lifetimeAllocated, secondary: true },
    { key: 'wal', header: 'Wallet balance', align: 'right', render: (m) => <span className="text-ink-2">{rm(m.wallet)}</span>, sort: (m) => m.wallet },
    { key: 'n', header: 'No. current', align: 'right', render: (m) => m.currentCount, sort: (m) => m.currentCount },
    { key: 'last', header: 'Last activity', render: (m) => <span className="num whitespace-nowrap">{date(m.inv.lastActivity)}</span>, sort: (m) => m.inv.lastActivity },
    { key: 'ctos', header: 'CTOS / KYC', render: (m) => (
      <span className="flex flex-col items-start gap-1"><StatusBadge status={`CTOS ${m.inv.ctos.toLowerCase()}`} /><StatusBadge status={`KYC ${m.inv.kyc.toLowerCase()}`} /></span>
    ), sort: (m) => `${m.inv.ctos}${m.inv.kyc}` },
    { key: 'acct', header: 'Account', render: (m) => <StatusBadge status={m.inv.accountStatus} />, sort: (m) => m.inv.accountStatus },
    { key: 'review', header: 'Review', render: (m) => {
      const c = pendingReview.get(m.inv.id);
      if (c) return <span title={`${c.summary} · ${date(c.date)}`}><StatusBadge status={c.type === 'Bank account' ? 'Bank change' : 'ID re-check'} tone="crit" /></span>;
      if (m.inv.accountStatus === 'Under review') return <StatusBadge status="Funding check" tone="warn" />;
      return <span className="text-ink-3">—</span>;
    }, sort: (m) => (pendingReview.has(m.inv.id) ? 0 : m.inv.accountStatus === 'Under review' ? 1 : 2) },
    { key: 'flag', header: 'Exception', render: (m) => {
      const f = m.failedTopUps ? `${m.failedTopUps} failed top-up${m.failedTopUps > 1 ? 's' : ''}` : isCtosIncomplete(m.inv) || isKycIncomplete(m.inv) ? `Onboarding ${onboardingAge(m.inv)}d` : null;
      return f ? <StatusBadge status={f} tone={m.failedTopUpAmount >= thresholds.highValueTopUp || onboardingAge(m.inv) > thresholds.onboardingStaleDays ? 'crit' : 'warn'} /> : <span className="text-ink-3">—</span>;
    } },
  ];

  return (
    <div id="investor-table" className="scroll-mt-40">
      <Panel icon={Users} iconTile="blue" title="All investors" info="Every investor record, shown by ID only for privacy. Clicking a band, funnel stage, exception or headline card above filters this list."
        actions={<Tabs label="Sort investors" value={tab} onChange={setTab} tabs={[{ key: 'current', label: 'By subscriptions' }, { key: 'deposits', label: 'By deposits' }, { key: 'wallet', label: 'By wallet' }]} />}>
        <div className="flex flex-wrap items-end gap-3 border-y border-line px-6 py-3">
          <SearchInput id="inv-q" value={q} onChange={setQ} placeholder="Investor ID, e.g. INV-1017" />
          <Select id="inv-band" label="Value band" value={band} onChange={setBand} options={[{ value: '', label: 'All bands' }, ...bandRows.map((b) => ({ value: String(b.key), label: b.short }))]} />
          <Select id="inv-ctos" label="CTOS status" value={ctos} onChange={setCtos} options={[{ value: '', label: 'Any' }, { value: 'Completed', label: 'Completed' }, { value: 'Incomplete', label: 'Incomplete' }, { value: 'Not started', label: 'Not started' }]} />
          <Select id="inv-kyc" label="KYC status" value={kyc} onChange={setKyc} options={[{ value: '', label: 'Any' }, { value: 'Completed', label: 'Completed' }, { value: 'Incomplete', label: 'Incomplete' }, { value: 'Not started', label: 'Not started' }]} />
          <span className="ml-auto text-[12px] text-ink-3">{rows.length} investors</span>
        </div>
        {chips.length > 0 && <div className="border-b border-line px-6 py-2.5"><Chips chips={chips} onClear={() => { onClearList(); setBand(''); setCtos(''); setKyc(''); setQ(''); }} /></div>}
        <DataTable key={`${tab}-${listKey}`} caption="All investors" rows={rows} rowKey={(m) => m.inv.id} onRowClick={(m) => openDrawer({ kind: 'investor', id: m.inv.id })}
          maxHeight="640px" initialSort={{ key: SORT[tab], dir: 'desc' }} columns={columns} />
      </Panel>
    </div>
  );
}
