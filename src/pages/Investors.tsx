import { BookOpen } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Funnel } from '../components/charts/Funnel';
import { HBars } from '../components/charts/Charts';
import { StatusBadge } from '../components/ui/Badge';
import { DataTable, type Column } from '../components/ui/DataTable';
import { KpiCard, deltaAbs, deltaPct } from '../components/ui/KpiCard';
import { Button, Card, Chips, SearchInput, Select, Tabs } from '../components/ui/Primitives';
import { AS_OF } from '../data/asOf';
import { INVESTORS, TRANSACTIONS } from '../data/investors';
import { date, int, pct, rm, rmShort } from '../lib/format';
import { investorLabel, investorMatches, investorSubLabel } from '../lib/identity';
import { compareDate } from '../lib/selectors/common';
import {
  FUNNEL_STAGES, activeInvestors, allInvestorMetrics, bandIndex, bands, funnel, investorActivity, isCtosIncomplete, isKycIncomplete, isOnboarded, onboardingAge,
  type InvestorMetrics,
} from '../lib/selectors/investors';
import { useApp, useParam } from '../state/AppState';

type Tab = 'current' | 'deposits' | 'wallet' | 'exceptions';

export function InvestorsPage() {
  const { period, role, bands: bandCfg, openDrawer, setParams, thresholds } = useApp();
  const [tab] = useParam('tab', 'current');
  const [band, setBand] = useParam('band');
  const [stage, setStage] = useParam('stage');
  const [ctos, setCtos] = useParam('ctos');
  const [kyc, setKyc] = useParam('kyc');
  const [q, setQ] = useState('');
  const [cohort, setCohort] = useState<'period' | 'all'>('period');
  const [funnelSel, setFunnelSel] = useState<string | null>(null);
  const [showDefs, setShowDefs] = useState(false);

  const effectiveTab: Tab = stage ? 'exceptions' : (tab as Tab);
  const at = period.end < AS_OF ? period.end : AS_OF;
  const cmp = compareDate(period);
  const act = activeInvestors(at);
  const actPrev = activeInvestors(cmp.at);
  const allocated = act.reduce((a, m) => a + m.current, 0);
  const allocatedPrev = actPrev.reduce((a, m) => a + m.current, 0);
  const activity = investorActivity(period);
  const prevActivity = period.compare ? investorActivity(period.compare) : null;
  const onboarded = INVESTORS.filter((i) => isOnboarded(i, at)).length;
  const onboardedPrev = INVESTORS.filter((i) => isOnboarded(i, cmp.at)).length;
  const ctosInc = INVESTORS.filter((i) => isCtosIncomplete(i, at));
  const kycInc = INVESTORS.filter((i) => isKycIncomplete(i, at));
  const fun = useMemo(() => funnel(cohort === 'all' ? null : period), [cohort, period]);
  const bandRows = bands(bandCfg, at, cmp.at);
  const totalCurrent = bandRows.reduce((a, b) => a + b.amount, 0);

  const metrics = allInvestorMetrics();
  const failedIds = new Set(TRANSACTIONS.filter((t) => t.type === 'Top-up' && t.status === 'Failed').map((t) => t.investorId));

  let rows: InvestorMetrics[] = metrics;
  if (effectiveTab === 'current') rows = metrics.filter((m) => m.currentCount > 0);
  if (effectiveTab === 'deposits') rows = metrics.filter((m) => m.deposits > 0);
  if (effectiveTab === 'wallet') rows = metrics.filter((m) => m.wallet > 0);
  if (effectiveTab === 'exceptions') rows = metrics.filter((m) => isCtosIncomplete(m.inv) || isKycIncomplete(m.inv) || failedIds.has(m.inv.id) || m.inv.issues.length > 0);
  if (stage === 'ctos') rows = rows.filter((m) => isCtosIncomplete(m.inv));
  if (stage === 'kyc') rows = rows.filter((m) => isKycIncomplete(m.inv));
  if (stage === 'incomplete') rows = rows.filter((m) => isCtosIncomplete(m.inv) || isKycIncomplete(m.inv));
  if (stage === 'failed') rows = rows.filter((m) => failedIds.has(m.inv.id));
  if (band) rows = rows.filter((m) => m.currentCount > 0 && bandIndex(m.current, bandCfg) === Number(band));
  if (ctos) rows = rows.filter((m) => m.inv.ctos === ctos);
  if (kyc) rows = rows.filter((m) => m.inv.kyc === kyc);
  if (q) rows = rows.filter((m) => investorMatches(m.inv, q, role));
  if (funnelSel) {
    const k = FUNNEL_STAGES.indexOf(funnelSel as (typeof FUNNEL_STAGES)[number]);
    const here = new Set(fun[k].ids);
    const next = new Set(fun[k + 1]?.ids ?? []);
    rows = metrics.filter((m) => here.has(m.inv.id) && (k === fun.length - 1 || !next.has(m.inv.id)));
  }
  const sortKey = effectiveTab === 'deposits' ? 'dep' : effectiveTab === 'wallet' ? 'wal' : effectiveTab === 'exceptions' ? 'last' : 'cur';

  const STAGE_LABEL: Record<string, string> = { ctos: 'CTOS incomplete', kyc: 'KYC incomplete', incomplete: 'CTOS or KYC incomplete', failed: 'Has failed top-ups' };
  const chips = [
    band && { key: 'band', label: `Band: ${bandRows[Number(band)]?.label}`, onRemove: () => setBand('') },
    stage && { key: 'stage', label: STAGE_LABEL[stage] ?? stage, onRemove: () => setStage('') },
    ctos && { key: 'ctos', label: `CTOS: ${ctos}`, onRemove: () => setCtos('') },
    kyc && { key: 'kyc', label: `KYC: ${kyc}`, onRemove: () => setKyc('') },
    funnelSel && { key: 'funnel', label: `Funnel: stopped at ${funnelSel}`, onRemove: () => setFunnelSel(null) },
    q && { key: 'q', label: `“${q}”`, onRemove: () => setQ('') },
  ].filter(Boolean) as { key: string; label: string; onRemove: () => void }[];

  const columns: Column<InvestorMetrics>[] = [
    { key: 'name', header: role === 'CEO' ? 'Investor' : 'Investor ID', render: (m) => (
      <span className="whitespace-nowrap font-medium">{investorLabel(m.inv, role)}<span className="block text-[11.5px] font-normal text-ink-3">{investorSubLabel(m.inv, role)}</span></span>
    ), sort: (m) => investorLabel(m.inv, role) },
    { key: 'cur', header: 'Current subscriptions', align: 'right', render: (m) => rm(m.current), sort: (m) => m.current },
    { key: 'dep', header: 'Lifetime deposits', align: 'right', render: (m) => rm(m.deposits), sort: (m) => m.deposits },
    { key: 'alloc', header: 'Allocated (lifetime)', align: 'right', render: (m) => rm(m.lifetimeAllocated), sort: (m) => m.lifetimeAllocated, secondary: true },
    { key: 'wal', header: 'Wallet balance', align: 'right', render: (m) => <span className="text-ink-2">{rm(m.wallet)}</span>, sort: (m) => m.wallet },
    { key: 'n', header: 'No. current', align: 'right', render: (m) => m.currentCount, sort: (m) => m.currentCount },
    { key: 'last', header: 'Latest subscription', render: (m) => <span className="num whitespace-nowrap">{date(m.lastSubscription)}</span>, sort: (m) => m.lastSubscription ?? '', secondary: true },
    { key: 'ctos', header: 'CTOS / KYC', render: (m) => (
      <span className="flex flex-col items-start gap-1"><StatusBadge status={`CTOS ${m.inv.ctos.toLowerCase()}`} /><StatusBadge status={`KYC ${m.inv.kyc.toLowerCase()}`} /></span>
    ), sort: (m) => `${m.inv.ctos}${m.inv.kyc}` },
    { key: 'acct', header: 'Account', render: (m) => <StatusBadge status={m.inv.accountStatus} /> },
    { key: 'flag', header: 'Exception', render: (m) => {
      const f = m.failedTopUps ? `${m.failedTopUps} failed top-up${m.failedTopUps > 1 ? 's' : ''}` : isCtosIncomplete(m.inv) || isKycIncomplete(m.inv) ? `Onboarding ${onboardingAge(m.inv)}d` : m.inv.issues.length ? 'Issue logged' : null;
      return f ? <StatusBadge status={f} tone={m.failedTopUpAmount >= thresholds.highValueTopUp || onboardingAge(m.inv) > thresholds.onboardingStaleDays ? 'crit' : 'warn'} /> : <span className="text-ink-3">—</span>;
    } },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total investors onboarded" value={int(onboarded)} delta={deltaAbs(onboarded, onboardedPrev, cmp.label, true)}
          sub={`Approved accounts · ${activity.onboarded} approved and ${activity.registered} registered in ${period.short}`} />
        <KpiCard label="CTOS incomplete" value={int(ctosInc.length)} tone={ctosInc.length ? 'warn' : undefined}
          delta={deltaAbs(ctosInc.length, INVESTORS.filter((i) => isCtosIncomplete(i, cmp.at)).length, cmp.label, false)}
          sub={`${ctosInc.filter((i) => onboardingAge(i) > thresholds.onboardingStaleDays).length} older than ${thresholds.onboardingStaleDays} days`} onClick={() => setStage('ctos')} />
        <KpiCard label="KYC incomplete" value={int(kycInc.length)} tone={kycInc.length ? 'warn' : undefined}
          delta={deltaAbs(kycInc.length, INVESTORS.filter((i) => isKycIncomplete(i, cmp.at)).length, cmp.label, false)}
          sub={`CTOS done, KYC pending · ${kycInc.filter((i) => onboardingAge(i) > thresholds.onboardingStaleDays).length} older than ${thresholds.onboardingStaleDays} days`} onClick={() => setStage('kyc')} />
        <KpiCard label={`Failed top-ups · ${period.short}`} value={int(activity.failed.length)} tone={activity.failed.some((t) => t.amount >= thresholds.highValueTopUp) ? 'crit' : undefined}
          delta={prevActivity ? deltaAbs(activity.failed.length, prevActivity.failed.length, `vs ${period.compare!.label}`, false) : undefined}
          sub={`${rm(activity.failedAmount)} in final failed status · pending excluded`} onClick={() => setStage('failed')} />
      </div>
      <div className="card grid grid-cols-2 divide-line md:grid-cols-4 md:divide-x">
        {[
          { l: 'Investors with current subscriptions', v: int(act.length), d: deltaAbs(act.length, actPrev.length, cmp.label, true) },
          { l: 'Funds allocated into tranches', v: rmShort(allocated), d: deltaPct(allocated, allocatedPrev, cmp.label) },
          { l: `Investors with completed withdrawals · ${period.short}`, v: int(activity.withdrawers), d: prevActivity ? deltaAbs(activity.withdrawers, prevActivity.withdrawers, `vs ${period.compare!.label}`, false) : undefined },
          { l: `Completed withdrawal amount · ${period.short}`, v: rm(activity.withdrawalAmount), d: prevActivity ? deltaPct(activity.withdrawalAmount, prevActivity.withdrawalAmount, `vs ${period.compare!.label}`, false) : undefined },
        ].map((x) => (
          <div key={x.l} className="px-5 py-3.5">
            <div className="text-[12px] text-ink-3">{x.l}</div>
            <div className="num mt-0.5 font-display text-[20px] font-semibold">{x.v}</div>
            {x.d && <div className={`num text-[11.5px] ${x.d.good === true ? 'text-good' : x.d.good === false ? 'text-crit' : 'text-ink-3'}`}>{x.d.text}</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-12">
        <Card className="2xl:col-span-7" title="Investor lifecycle funnel"
          subtitle={cohort === 'all' ? 'All registered investors · status as at reporting date' : `Investors registered in ${period.label} · status as at reporting date`}
          actions={<Tabs label="Funnel cohort" value={cohort} onChange={setCohort} tabs={[{ key: 'period', label: 'Registered in period' }, { key: 'all', label: 'All investors' }]} />}>
          {fun[0].count ? <Funnel stages={fun} selected={funnelSel} onSelect={setFunnelSel} /> : <p className="py-8 text-center text-[13px] text-ink-3">No registrations in this period. Switch to “All investors”.</p>}
          <p className="mt-3 text-[11.5px] text-ink-3">CTOS and KYC are separate stages. Select a bar to list investors who stopped at that stage. Conversion below 80% from the previous stage is highlighted.</p>
        </Card>
        <Card className="2xl:col-span-5" title="Current subscriptions by value band" subtitle={`${act.length} active investors · ${rm(totalCurrent)} · select a band to filter rankings`}>
          <HBars valueLabel="Current subscribed amount" color="var(--series-1)" selected={band || null} onSelect={(k) => setBand(band === k ? '' : k)}
            data={bandRows.map((b) => ({ key: String(b.key), label: b.short, value: b.amount, display: rmShort(b.amount), sub: `${b.count} investors · ${pct(b.share)} of value` }))} />
          <table className="mt-2 w-full text-[12.5px]">
            <caption className="sr-only">Value band segmentation</caption>
            <thead><tr className="border-b border-line text-[11.5px] text-ink-3">
              <th scope="col" className="py-1.5 text-left font-medium">Band</th><th scope="col" className="py-1.5 text-right font-medium">Investors</th>
              <th scope="col" className="py-1.5 text-right font-medium">Amount</th><th scope="col" className="py-1.5 text-right font-medium">Share</th>
              <th scope="col" className="py-1.5 text-right font-medium">Change</th><th scope="col" className="py-1.5 pl-2 text-left font-medium">Concentration</th>
            </tr></thead>
            <tbody>
              {bandRows.map((b) => (
                <tr key={b.key} className={`border-b border-line/60 ${band === String(b.key) ? 'bg-accent-soft/60' : ''}`}>
                  <th scope="row" className="whitespace-nowrap py-1.5 text-left font-medium" title={b.label}>{b.short}</th>
                  <td className="num py-1.5 text-right">{b.count}</td>
                  <td className="num whitespace-nowrap py-1.5 text-right">{rm(b.amount)}</td>
                  <td className="num py-1.5 text-right">{pct(b.share)}</td>
                  <td className="num whitespace-nowrap py-1.5 text-right text-ink-2">{b.count - b.prevCount >= 0 ? '+' : '−'}{Math.abs(b.count - b.prevCount)} inv</td>
                  <td className="py-1.5 pl-2">{b.concentrated ? <StatusBadge status="Concentrated" tone="warn" /> : <StatusBadge status="Normal" tone="mute" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[11.5px] text-ink-3">Change {cmp.label}. Concentrated: band holds ≥ 50% of value with ≤ 25% of active investors. Bands are configurable in Demo settings.</p>
        </Card>
      </div>

      <Card title="Investor rankings" bodyClass="p-0"
        subtitle={role === 'CEO' ? 'CEO View: synthetic names visible' : 'Management View: identities anonymised (INV IDs)'}
        actions={<Tabs label="Ranking" value={effectiveTab} onChange={(t) => { setParams(t === 'current' ? {} : { tab: t }); setFunnelSel(null); }}
          tabs={[{ key: 'current', label: 'Largest current subscriptions' }, { key: 'deposits', label: 'Highest total deposited' }, { key: 'wallet', label: 'Highest wallet balance' }, { key: 'exceptions', label: 'Onboarding & exceptions' }]} />}>
        <div className="flex flex-wrap items-end gap-3 border-b border-line px-5 py-3">
          <SearchInput id="inv-q" value={q} onChange={setQ} placeholder={role === 'CEO' ? 'Name or INV ID' : 'INV ID'} />
          <Select id="inv-band" label="Value band" value={band} onChange={setBand} options={[{ value: '', label: 'All bands' }, ...bandRows.map((b) => ({ value: String(b.key), label: b.short }))]} />
          <Select id="inv-ctos" label="CTOS status" value={ctos} onChange={setCtos} options={[{ value: '', label: 'Any' }, { value: 'Completed', label: 'Completed' }, { value: 'Incomplete', label: 'Incomplete' }, { value: 'Not started', label: 'Not started' }]} />
          <Select id="inv-kyc" label="KYC status" value={kyc} onChange={setKyc} options={[{ value: '', label: 'Any' }, { value: 'Completed', label: 'Completed' }, { value: 'Incomplete', label: 'Incomplete' }, { value: 'Not started', label: 'Not started' }]} />
          <span className="ml-auto text-[12px] text-ink-3">{rows.length} investors</span>
        </div>
        {chips.length > 0 && <div className="border-b border-line px-5 py-2.5"><Chips chips={chips} onClear={() => { setParams({}); setQ(''); setFunnelSel(null); }} /></div>}
        {effectiveTab === 'wallet' && <p className="border-b border-line bg-sunken/50 px-5 py-2 text-[12px] text-ink-3">Wallet balance is uninvested cash and is a secondary measure. Use current subscriptions for concentration decisions.</p>}
        <DataTable key={effectiveTab} caption="Investor rankings" rows={rows} rowKey={(m) => m.inv.id} onRowClick={(m) => openDrawer({ kind: 'investor', id: m.inv.id })}
          maxHeight="560px" initialSort={{ key: sortKey, dir: 'desc' }} columns={columns} />
      </Card>

      <Card title={<span className="flex items-center gap-2"><BookOpen size={15} aria-hidden /> Investor definitions</span>}
        actions={<Button size="sm" variant="ghost" onClick={() => setShowDefs((v) => !v)}>{showDefs ? 'Hide' : 'Show'} definitions</Button>} bodyClass={showDefs ? 'p-5' : 'hidden'}>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-[13px] md:grid-cols-2">
          {[
            ['Current active investor', 'An investor with at least one current subscription.'],
            ['Allocated funds', 'Investor funds successfully allocated into one or more tranches.'],
            ['Total money deposited', 'Cumulative value of successful deposits made by the investor.'],
            ['CTOS incomplete', 'An onboarding record in which the required CTOS stage has not been successfully completed.'],
            ['KYC incomplete', 'An onboarding record in which the required KYC stage has not been successfully completed. Counted once CTOS is complete.'],
            ['Failed top-up', 'A top-up transaction with a final failed status, excluding pending transactions.'],
            ['Withdrawal', 'A completed transfer of investor funds out of the platform or wallet. An investor who withdraws may remain active.'],
          ].map(([t, d]) => <div key={t}><dt className="font-semibold">{t}</dt><dd className="text-ink-2">{d}</dd></div>)}
        </dl>
      </Card>
    </div>
  );
}
