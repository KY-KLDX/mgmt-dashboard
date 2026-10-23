import { ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PnlTrend, SubscriptionTrend } from '../components/charts/Charts';
import { StatusBadge, toneFor } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { KpiCard, deltaAbs, deltaPct } from '../components/ui/KpiCard';
import { Card, Chips, InfoTip, Progress, SearchInput, Select, Tabs } from '../components/ui/Primitives';
import { ISSUERS } from '../data/issuers';
import { LATEST_CLOSED_PNL_MONTH, PNL } from '../data/pnl';
import { TRANCHE_STAGES, type TrancheStage } from '../data/types';
import { date, monthLabel, monthLong, pct, rm, rmShort, signed } from '../lib/format';
import { allTrancheStats, closedPnl, issuerShort, latestPnlFor, periodFinance, pnlView, trendSeries, type PnlView, type TrancheStats } from '../lib/selectors/finance';
import { useApp, useParam } from '../state/AppState';
import { shiftMonthKey, monthKey } from '../data/asOf';

const RISKS = ['Critical', 'Attention', 'On track', 'Completed', 'Not started'];

export function FinancePage() {
  const { period, thresholds, openDrawer, setParams } = useApp();
  const [stage, setStage] = useParam('stage');
  const [issuer, setIssuer] = useParam('issuer');
  const [risk, setRisk] = useParam('risk');
  const [month, setMonth] = useParam('month');
  const [view, setView] = useParam('view', 'current');
  const [from, setFrom] = useParam('from');
  const [to, setTo] = useParam('to');
  const [q, setQ] = useState('');
  const [metric, setMetric] = useState<'ebitda' | 'netResult'>('ebitda');

  const fin = periodFinance(period, thresholds);
  const cmp = period.compare ? periodFinance(period.compare, thresholds) : null;
  const pnl = latestPnlFor(period, thresholds);
  const prevPnl = pnlView(shiftMonthKey(pnl.month, -1), thresholds);
  const trend = useMemo(() => trendSeries(thresholds), [thresholds]);
  const stats = allTrancheStats(thresholds);
  const cl = period.compare ? `vs ${period.compare.label}` : '';
  const metricVal = pnl[metric];
  const budgetVal = pnl.budget[metric];

  const rows = stats.filter((s) => {
    const t = s.tranche;
    if (view === 'current' && t.stage === 'Matured') return false;
    if (view === 'historical' && t.stage !== 'Matured') return false;
    if (stage && t.stage !== stage) return false;
    if (issuer && t.issuerId !== issuer) return false;
    if (risk && s.risk !== risk) return false;
    if (month && monthKey(t.closeDate) !== month) return false;
    if (from && t.closeDate < from) return false;
    if (to && t.closeDate > to) return false;
    if (q && !`${t.name} ${s.issuer} ${t.id}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const chips = [
    stage && { key: 'stage', label: `Stage: ${stage}`, onRemove: () => setStage('') },
    issuer && { key: 'issuer', label: `Issuer: ${issuerShort(issuer)}`, onRemove: () => setIssuer('') },
    risk && { key: 'risk', label: `Risk: ${risk}`, onRemove: () => setRisk('') },
    month && { key: 'month', label: `Closed in ${monthLong(month)}`, onRemove: () => setMonth('') },
    from && { key: 'from', label: `Closes from ${date(from)}`, onRemove: () => setFrom('') },
    to && { key: 'to', label: `Closes to ${date(to)}`, onRemove: () => setTo('') },
    q && { key: 'q', label: `“${q}”`, onRemove: () => setQ('') },
  ].filter(Boolean) as { key: string; label: string; onRemove: () => void }[];
  const clearAll = () => { setQ(''); setParams(view !== 'current' ? { view } : {}); };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
        <KpiCard label={`Total subscription value · ${period.short}`} value={rmShort(fin.gross)} delta={deltaPct(fin.gross, cmp?.gross, cl)}
          sub="Gross requests in tranches closed in the period, including rejected and cancelled" />
        <KpiCard label={`Successful subscription value · ${period.short}`} value={rmShort(fin.successful)} delta={deltaPct(fin.successful, cmp?.successful, cl)}
          sub={`${fin.tranches.length} tranche${fin.tranches.length === 1 ? '' : 's'} allocated`} />
        <KpiCard label="Subscription success rate" value={pct(fin.successRate)} delta={cmp ? deltaAbs(fin.successRate * 100, cmp.successRate * 100, `pts ${cl}`, true, (n) => n.toFixed(1)) : undefined}
          sub="Successful ÷ gross subscription value" />
        <KpiCard label={`Recognised revenue · ${period.short}`} value={rmShort(fin.revenue)} delta={deltaPct(fin.revenue, cmp?.revenue, cl)}
          sub="Σ successful amount × tranche fee rate" />
        <KpiCard label="Weighted average fee rate" value={pct(fin.feeRate, 2)} delta={cmp ? deltaAbs(fin.feeRate * 100, cmp.feeRate * 100, `pts ${cl}`, true, (n) => n.toFixed(2)) : undefined}
          sub="Revenue ÷ successful subscriptions" />
        <KpiCard label={`Month-end ${metric === 'ebitda' ? 'EBITDA' : 'net result'} · ${monthLong(pnl.month)}`} value={rmShort(metricVal)}
          delta={prevPnl ? deltaAbs(metricVal, prevPnl[metric], `vs ${monthLong(prevPnl.month)}`, true, rm) : undefined}
          sub={<span>Company-level P&L, not tranche profit{pnl.month < monthKey(period.end) ? ' · latest closed month' : ''}</span>} />
        <KpiCard label={`Variance against budget · ${monthLong(pnl.month)}`} value={rmShort(metricVal - budgetVal)} tone={metricVal < budgetVal ? 'warn' : undefined}
          delta={{ text: `${metricVal >= budgetVal ? 'Better' : 'Worse'} than budget ${rm(budgetVal)}`, direction: metricVal >= budgetVal ? 'up' : 'down', good: metricVal >= budgetVal }}
          sub={`${metric === 'ebitda' ? 'EBITDA' : 'Net result'} actual vs budget`} />
      </div>

      <Card title="Tranche pipeline" subtitle="Select a stage to filter the tranche table">
        <ol className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          {TRANCHE_STAGES.map((st, k) => {
            const inStage = stats.filter((s) => s.tranche.stage === st);
            const amount = inStage.reduce((a, s) => a + (s.indicative ? s.pending : s.successful), 0);
            const flagged = inStage.filter((s) => s.risk === 'Critical' || s.risk === 'Attention').length;
            const active = stage === st;
            return (
              <li key={st} className="relative">
                <button onClick={() => { setStage(active ? '' : st); if (st === 'Matured' && !active) setView('all'); }} aria-pressed={active}
                  className={`flex h-full w-full flex-col gap-1 rounded-lg border p-3 text-left transition-colors ${active ? 'border-accent bg-accent-soft/70' : 'border-line bg-surface hover:bg-sunken'}`}>
                  <span className="text-[12px] font-medium text-ink-2">{k + 1}. {st}</span>
                  <span className="num font-display text-[24px] font-semibold leading-none">{inStage.length}</span>
                  <span className="num text-[12px] text-ink-3">{rmShort(amount)} {st === 'Upcoming' ? 'subscribed' : ['Open', 'Fully Subscribed'].includes(st) ? 'pending' : 'allocated'}</span>
                  {flagged > 0 && <span className="mt-1"><StatusBadge status={`${flagged} flagged`} tone="warn" /></span>}
                </button>
                {k < 5 && <ChevronRight size={16} className="absolute -right-[13px] top-1/2 z-10 hidden -translate-y-1/2 text-ink-3 xl:block" aria-hidden />}
              </li>
            );
          })}
        </ol>
      </Card>

      <Card title="Tranches" bodyClass="p-0"
        subtitle={`${rows.length} of ${stats.filter((s) => (view === 'current' ? s.tranche.stage !== 'Matured' : view === 'historical' ? s.tranche.stage === 'Matured' : true)).length} tranches · revenue is recognised only on successful allocations`}
        actions={<Tabs label="Tranche set" value={view as 'current' | 'historical' | 'all'} onChange={setView}
          tabs={[{ key: 'current', label: 'Current' }, { key: 'historical', label: 'Historical' }, { key: 'all', label: 'All' }]} />}>
        <div className="flex flex-wrap items-end gap-3 border-b border-line px-5 py-3">
          <SearchInput id="tr-q" value={q} onChange={setQ} placeholder="Tranche, issuer or ID" />
          <Select id="tr-stage" label="Stage" value={stage} onChange={setStage} options={[{ value: '', label: 'All stages' }, ...TRANCHE_STAGES.map((s) => ({ value: s, label: s }))]} />
          <Select id="tr-issuer" label="Issuer" value={issuer} onChange={setIssuer} options={[{ value: '', label: 'All issuers' }, ...ISSUERS.map((i) => ({ value: i.id, label: issuerShort(i.id) }))]} />
          <Select id="tr-risk" label="Risk status" value={risk} onChange={setRisk} options={[{ value: '', label: 'Any risk' }, ...RISKS.map((r) => ({ value: r, label: r }))]} />
          <label htmlFor="tr-from" className="flex flex-col gap-1"><span className="text-[11px] font-medium text-ink-3">Closing from</span>
            <input id="tr-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 rounded-lg border border-line bg-surface px-2 text-[12.5px]" /></label>
          <label htmlFor="tr-to" className="flex flex-col gap-1"><span className="text-[11px] font-medium text-ink-3">Closing to</span>
            <input id="tr-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 rounded-lg border border-line bg-surface px-2 text-[12.5px]" /></label>
        </div>
        {chips.length > 0 && <div className="border-b border-line px-5 py-2.5"><Chips chips={chips} onClear={clearAll} /></div>}
        <TrancheTable rows={rows} onOpen={(s) => openDrawer({ kind: 'tranche', id: s.tranche.id })} />
      </Card>

      <Card title="Monthly successful subscriptions" subtitle="Tranche-derived. Click a month to filter the tranche table to tranches closed that month.">
        <SubscriptionTrend data={trend} height={230} selected={month || undefined} onMonth={(m) => setMonth(m === month ? '' : m)} />
      </Card>

      <PnlSection metric={metric} setMetric={setMetric} />
    </div>
  );
}

function TrancheTable({ rows, onOpen }: { rows: TrancheStats[]; onOpen: (s: TrancheStats) => void }) {
  return (
    <DataTable caption="Tranche table" rows={rows} rowKey={(s) => s.tranche.id} onRowClick={onOpen} maxHeight="560px" initialSort={{ key: 'close', dir: 'desc' }}
      columns={[
        { key: 'name', header: 'Tranche', render: (s) => <span className="whitespace-nowrap font-medium">{s.tranche.name}<span className="block text-[11.5px] font-normal text-ink-3">{s.tranche.id}</span></span>, sort: (s) => s.tranche.name },
        { key: 'issuer', header: 'Issuer', render: (s) => <span className="whitespace-nowrap text-ink-2">{issuerShort(s.tranche.issuerId)}</span>, sort: (s) => s.issuer, secondary: true },
        { key: 'open', header: 'Opens', render: (s) => <span className="num whitespace-nowrap">{date(s.tranche.openDate)}</span>, sort: (s) => s.tranche.openDate, secondary: true },
        { key: 'close', header: 'Closes', render: (s) => <span className="num whitespace-nowrap">{date(s.tranche.closeDate)}</span>, sort: (s) => s.tranche.closeDate },
        { key: 'target', header: 'Target', align: 'right', render: (s) => rm(s.tranche.target), sort: (s) => s.tranche.target },
        { key: 'gross', header: 'Gross requests', align: 'right', render: (s) => rm(s.gross), sort: (s) => s.gross },
        { key: 'succ', header: 'Successful', align: 'right', render: (s) => (s.indicative ? <span className="text-ink-3">Pending</span> : rm(s.successful)), sort: (s) => s.successful },
        { key: 'subs', header: 'Subscribers', align: 'right', render: (s) => s.subscribers, sort: (s) => s.subscribers },
        { key: 'ful', header: 'Fulfilment', align: 'right', render: (s) => (
          <div className="ml-auto w-24"><div className="mb-1">{pct(s.fulfilment, 0)}{s.indicative && <span className="text-[11px] text-ink-3"> ind.</span>}</div>
            <Progress value={s.fulfilment} tone={s.risk === 'Critical' ? 'crit' : s.risk === 'Attention' ? 'warn' : 'accent'} /></div>
        ), sort: (s) => s.fulfilment },
        { key: 'fee', header: 'Fee rate', align: 'right', render: (s) => pct(s.tranche.feeRate, 2), sort: (s) => s.tranche.feeRate },
        { key: 'rev', header: 'Recognised revenue', align: 'right', render: (s) => (s.revenue ? rm(s.revenue) : <span className="text-ink-3">RM 0</span>), sort: (s) => s.revenue },
        { key: 'days', header: 'Days to / since close', align: 'right', render: (s) => (s.daysToClose >= 0 ? `${s.daysToClose} to close` : `${-s.daysToClose} since`), sort: (s) => s.daysToClose },
        { key: 'stage', header: 'Stage', render: (s) => <StatusBadge status={s.tranche.stage} />, sort: (s) => TRANCHE_STAGES.indexOf(s.tranche.stage as TrancheStage) },
        { key: 'risk', header: 'Risk', render: (s) => <span title={s.riskReason ?? undefined}><StatusBadge status={s.risk} tone={toneFor(s.risk === 'Attention' ? 'attention' : s.risk)} /></span>, sort: (s) => RISKS.indexOf(s.risk) },
      ]} />
  );
}

const LINES: { key: keyof PnlView; label: string; budget?: 'revenue' | 'opex' | 'ebitda' | 'netResult'; strong?: boolean; cost?: boolean }[] = [
  { key: 'revenue', label: 'Revenue (recognised, tranche-derived)', budget: 'revenue', strong: true },
  { key: 'personnel', label: 'Personnel costs', cost: true },
  { key: 'marketing', label: 'Marketing costs', cost: true },
  { key: 'technology', label: 'Technology operating costs', cost: true },
  { key: 'professional', label: 'Professional fees', cost: true },
  { key: 'premises', label: 'Premises and administration', cost: true },
  { key: 'otherOpex', label: 'Other operating expenses', cost: true },
  { key: 'opex', label: 'Total operating expenses', budget: 'opex', strong: true, cost: true },
  { key: 'ebitda', label: 'EBITDA', budget: 'ebitda', strong: true },
  { key: 'depreciation', label: 'Depreciation and amortisation', cost: true },
  { key: 'financeCosts', label: 'Finance costs', cost: true },
  { key: 'netResult', label: 'Net result', budget: 'netResult', strong: true },
];

function PnlSection({ metric, setMetric }: { metric: 'ebitda' | 'netResult'; setMetric: (m: 'ebitda' | 'netResult') => void }) {
  const { thresholds, params } = useApp();
  const months = closedPnl(thresholds);
  const [sel, setSel] = useState(LATEST_CLOSED_PNL_MONTH);
  const [mode, setMode] = useState<'month' | 'trend'>('month');
  const p = pnlView(sel, thresholds)!;
  const prev = pnlView(shiftMonthKey(sel, -1), thresholds);
  const trend = trendSeries(thresholds);
  const v = (x: PnlView | null, k: keyof PnlView) => (x ? (x[k] as number) : null);

  return (
    <Card id="pnl" title={<span className="flex items-center gap-2">Monthly company P&L <InfoTip text="Synthetic figures. Revenue equals recognised tranche revenue for the month; costs are company-level and not allocated to tranches." /></span>}
      subtitle="Synthetic month-end figures · company level · not tranche profitability"
      className={params.section === 'pnl' ? 'ring-2 ring-accent/40' : ''}
      actions={<>
        <Tabs label="P&L view" value={mode} onChange={setMode} tabs={[{ key: 'month', label: 'Month detail' }, { key: 'trend', label: '12-month view' }]} />
        <Tabs label="Profit measure" value={metric} onChange={setMetric} tabs={[{ key: 'ebitda', label: 'EBITDA' }, { key: 'netResult', label: 'Net result' }]} />
      </>}>
      <p className="mb-4 rounded-lg border border-info/25 bg-info-soft px-3 py-2 text-[12.5px] text-ink-2">
        Tranche recognised revenue is calculated using the applicable KLDX fee rate. Company profitability is presented separately using month-end P&L data because operating costs are not currently allocated to individual tranches.
      </p>
      {mode === 'month' ? (
        <div className="grid grid-cols-1 gap-6 2xl:grid-cols-5">
          <div className="2xl:col-span-3">
            <div className="mb-3 flex items-end gap-3">
              <Select id="pnl-month" label="Month" value={sel} onChange={setSel} options={[...months].reverse().map((m) => ({ value: m.month, label: monthLong(m.month) }))} />
              <span className="pb-1.5 text-[12px] text-ink-3">October 2026 not yet closed.</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <caption className="sr-only">Monthly P&L for {monthLong(sel)}</caption>
                <thead>
                  <tr className="border-b border-line text-[11.5px] text-ink-2">
                    <th scope="col" className="py-2 pr-3 text-left font-semibold">Line</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">{monthLong(sel)}</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">Budget</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">Variance</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">{prev ? monthLong(prev.month) : 'Previous'}</th>
                    <th scope="col" className="py-2 pl-3 text-right font-semibold">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {LINES.map((l) => {
                    const a = v(p, l.key)!;
                    const b = l.budget ? p.budget[l.budget] : null;
                    const pv = v(prev, l.key);
                    const varc = b === null ? null : a - b;
                    const goodVar = varc === null ? null : l.cost ? varc <= 0 : varc >= 0;
                    const shown = l.cost ? -a : a;
                    return (
                      <tr key={l.key} className={`border-b border-line/70 ${l.strong ? 'bg-sunken/50 font-semibold' : ''}`}>
                        <th scope="row" className={`py-2 pr-3 text-left ${l.strong ? 'font-semibold' : 'pl-3 font-normal text-ink-2'}`}>{l.label}</th>
                        <td className="num whitespace-nowrap px-3 py-2 text-right">{rm(shown)}</td>
                        <td className="num whitespace-nowrap px-3 py-2 text-right text-ink-2">{b === null ? '—' : rm(l.cost ? -b : b)}</td>
                        <td className={`num whitespace-nowrap px-3 py-2 text-right ${goodVar === null ? 'text-ink-3' : goodVar ? 'text-good' : 'text-crit'}`}>
                          {varc === null ? '—' : `${signed(l.cost ? -varc : varc, rm)} ${goodVar ? '▲' : '▼'}`}
                        </td>
                        <td className="num whitespace-nowrap px-3 py-2 text-right text-ink-2">{pv === null ? '—' : rm(l.cost ? -pv : pv)}</td>
                        <td className="num whitespace-nowrap py-2 pl-3 text-right text-ink-2">{pv === null ? '—' : signed(l.cost ? -(a - pv) : a - pv, rm)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11.5px] text-ink-3">Costs shown as negative values. Variance arrows: ▲ better than budget, ▼ worse. Budget is set for revenue, total operating expenses, EBITDA and net result only.</p>
          </div>
          <div className="2xl:col-span-2">
            <h3 className="mb-2 text-[13px] font-semibold">Monthly trend</h3>
            <PnlTrend data={trend} metric={metric} height={300} />
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full min-w-[1100px] text-[12.5px]">
            <caption className="sr-only">Twelve-month P&L</caption>
            <thead>
              <tr className="border-b border-line text-[11.5px] text-ink-2">
                <th scope="col" className="sticky left-0 bg-surface py-2 pr-3 text-left font-semibold">Line</th>
                {months.map((m) => <th key={m.month} scope="col" className="px-2 py-2 text-right font-semibold">{monthLabel(m.month)}</th>)}
                <th scope="col" className="px-2 py-2 text-right font-semibold">12-month total</th>
              </tr>
            </thead>
            <tbody>
              {LINES.map((l) => (
                <tr key={l.key} className={`border-b border-line/70 ${l.strong ? 'bg-sunken/50 font-semibold' : ''}`}>
                  <th scope="row" className={`sticky left-0 whitespace-nowrap bg-surface py-2 pr-3 text-left ${l.strong ? 'font-semibold' : 'font-normal text-ink-2'}`}>{l.label}</th>
                  {months.map((m) => { const x = m[l.key] as number; return <td key={m.month} className="num whitespace-nowrap px-2 py-2 text-right">{rm(l.cost ? -x : x)}</td>; })}
                  <td className="num whitespace-nowrap px-2 py-2 text-right">{rm(months.reduce((a, m) => a + (l.cost ? -(m[l.key] as number) : (m[l.key] as number)), 0))}</td>
                </tr>
              ))}
              <tr className="text-ink-2">
                <th scope="row" className="sticky left-0 bg-surface py-2 pr-3 text-left font-normal">{metric === 'ebitda' ? 'EBITDA' : 'Net result'} budget variance</th>
                {months.map((m) => { const d = m[metric] - m.budget[metric]; return <td key={m.month} className={`num whitespace-nowrap px-2 py-2 text-right ${d >= 0 ? 'text-good' : 'text-crit'}`}>{signed(d, rm)}</td>; })}
                <td className="num whitespace-nowrap px-2 py-2 text-right">{signed(months.reduce((a, m) => a + m[metric] - m.budget[metric], 0), rm)}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-2 text-[11.5px] text-ink-3">{PNL.length - 1} closed months shown. Costs as negative values. Synthetic demonstration data.</p>
        </div>
      )}
    </Card>
  );
}
