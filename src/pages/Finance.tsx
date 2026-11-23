// Finance: subscriptions, revenue by fee type, tranche position with payment recording, company P&L.
import { AlertTriangle, BarChart3, CalendarClock, ChevronRight, Coins, FileSpreadsheet, Target, Trophy, Upload, Users, Workflow } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PnlTrend, TipBox } from '../components/charts/Charts';
import { deltaAbs, deltaPct, type KpiDelta } from '../components/ui/KpiCard';
import { InfoTip, Select, Tabs } from '../components/ui/Primitives';
import { HeroKpi, Panel } from '../components/ui/Showcase';
import { AS_OF, TREND_MONTHS } from '../data/asOf';

import { LATEST_CLOSED_PNL_MONTH } from '../data/pnl';
import { TRANCHE_STAGES } from '../data/types';
import { dateShort, monthLabel, monthLong, pct, rm, rmAxis, rmShort, signed } from '../lib/format';
import { allTrancheStats, closedPnl, issuerShort, periodFinance, pnlView, trendSeries, type PnlView, type TrancheStats } from '../lib/selectors/finance';
import { FEE_GROUPS, addMonths, dueIn, feeInvoices, feesByMonth, feesByTranche, feesIn, invoiceState, stepState, workflow, type Entry, type StepState } from '../lib/selectors/fees';
import { FinanceTables, type InvRecords } from './FinanceTables';
import { allocationTracker } from '../lib/selectors/operations';
import { useApp } from '../state/AppState';

const REPORTED_ADJUST: Record<string, number> = { '2026-09': -6_750 };
const VARIANCE_FLAG = 5_000;
const STAGE_LABEL: Record<string, string> = { 'Issued / Settled': 'Issued', Matured: 'Matured / redeemed' };
const FEE_VAR = ['var(--fee-1)', 'var(--fee-2)', 'var(--fee-3)', 'var(--fee-4)', 'var(--fee-5)'];

type Records = Record<string, Entry[]>;

/** Workflow per allocated tranche with the viewer's in-browser records merged on top. */
function useWorkflows(stats: TrancheStats[], records: Records) {
  const released = new Map(allocationTracker().map((r) => [r.tranche.id, r.releasedOn]));
  return new Map(stats.map((s) => {
    const steps = workflow(s, released.get(s.tranche.id) ?? null).map((st) => stepState(st, records[st.key]));
    return [s.tranche.id, { steps, next: steps.find((x) => !x.done) ?? null }];
  }));
}

// ---------- Page ----------------------------------------------------------------------------

export function FinancePage() {
  const { period, thresholds } = useApp();
  const [records, setRecords] = useState<Records>({});
  const [stage, setStage] = useState('');
  const [invRecords, setInvRecords] = useState<InvRecords>({});
  const inv = feeInvoices(thresholds).invoices.map((i) => invoiceState(i, invRecords[i.id]));
  const collected = inv.filter((i) => i.paid).reduce((a, i) => a + i.inv.amount, 0);
  const receivable = inv.reduce((a, i) => a + i.outstanding, 0);
  const fin = periodFinance(period, thresholds);
  const cmp = period.compare ? periodFinance(period.compare, thresholds) : null;
  // Same comparison label as the Overview and Investor Operations cards.
  const cl = period.compare ? `vs ${period.compare.label.replace(/^same point in /, '').replace(/^(\w{3})\w* (\d{4})$/, '$1 $2')}` : 'vs budget';
  const stats = allTrancheStats(thresholds);
  const flows = useWorkflows(stats, records);
  const end = period.end < AS_OF ? period.end : AS_OF;
  const revenue = feesIn(thresholds, period.start, end);
  const revenueCmp = period.compare ? feesIn(thresholds, period.compare.start, period.compare.end) : null;
  const months = useMemo(() => feesByMonth(thresholds, TREND_MONTHS), [thresholds]);

  // Payments due to investors in the next 30 days (issuer or payout step still open).
  const due = [...flows.values()].map((f) => f.next).filter((n): n is StepState => !!n && (n.step.kind === 'issuer' || n.step.kind === 'investors') && dueIn(n.step.due) <= 30);
  const dueAmt = due.reduce((a, n) => a + (n.step.amount ?? 0), 0);
  const dueIn_ = due.reduce((a, n) => a + (n.step.kind === 'issuer' ? n.received : n.step.amount ?? 0), 0);
  const short = due.filter((n) => n.step.kind === 'issuer' && n.received < (n.step.amount ?? 0));
  const shortAmt = short.reduce((a, n) => a + (n.step.amount ?? 0) - n.received, 0);
  const dueDelta: KpiDelta = short.length
    ? { text: `${short.length} shortfall · RM ${Math.round(shortAmt / 1000)}k`, direction: 'down', good: false }
    : { text: `${pct(dueAmt ? dueIn_ / dueAmt : 1, 0)} issuer funds in`, direction: 'flat', good: null };

  return (
    <div className="space-y-6">

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <HeroKpi compact icon={Users} tone="blue" label="Total subscriptions" value={rmShort(fin.successful)} delta={deltaPct(fin.successful, cmp?.successful, cl)}
          spark={trendSeries(thresholds).slice(-7).map((t) => t.subs)} info="Successful (allocated) subscriptions in tranches closed in the period." />
        <HeroKpi compact icon={Coins} tone="teal" label="Revenue" value={rmShort(revenue)} delta={deltaPct(revenue, revenueCmp, cl)}
          spark={months.slice(-7).map((m) => m.total as number)} info={`All fee types earned in the period: distribution, application & legal DD, listing & custody, payment & service, delisting. All-time: collected ${rm(collected)} · receivable ${rm(receivable)}.`} />
        <HeroKpi compact icon={Target} tone="violet" label="Success rate" value={pct(fin.successRate, 0)}
          delta={cmp ? deltaAbs(fin.successRate * 100, cmp.successRate * 100, `pts ${cl.replace(/^vs /, 'vs ')}`, true, (n) => n.toFixed(1)) : undefined}
          info="Successful ÷ gross subscription value, including rejected and cancelled requests." />
        <HeroKpi compact icon={CalendarClock} tone={short.length ? 'red' : 'amber'} label="Due to investors · 30d" value={rmShort(dueAmt)} delta={dueDelta}
          onClick={() => document.getElementById('payments')?.scrollIntoView({ behavior: 'smooth' })}
          info="Profit and principal due to investors within 30 days, and how much the issuers have paid in so far." />
      </div>

      <Pipeline stats={stats} stage={stage} setStage={setStage} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8"><FeePerformance months={months} /></div>
        <div className="min-w-0 xl:col-span-4"><TopRevenue stats={stats} /></div>
      </div>

      <FinanceTables stats={stats} flows={flows} records={records} setRecords={setRecords} invRecords={invRecords} setInvRecords={setInvRecords} stage={stage} setStage={setStage} />

      <CompanyPnl />
    </div>
  );
}

// ---------- Performance analysis: revenue by fee type ---------------------------------------

function FeePerformance({ months }: { months: Record<string, number | string>[] }) {
  const [mode, setMode] = useState<'amount' | 'share'>('amount');
  const data = mode === 'amount' ? months : months.map((m) => {
    const t = (m.total as number) || 1;
    const r: Record<string, number | string> = { ...m };
    FEE_GROUPS.forEach((g) => (r[g.key] = ((m[g.key] as number) / t) * 100));
    return r;
  });
  const ytd = months.filter((m) => (m.month as string) >= '2026-01');
  const ytdTotal = ytd.reduce((a, m) => a + (m.total as number), 0);
  return (
    <Panel icon={BarChart3} title="Revenue by fee type" info="Every fee earned each month, by type, from the KLDX Fees & Charges schedule (standard fees). Investor subscription fee is waived; deposit and withdrawal fees are absorbed by KLDX; small transaction fees (refund, transfer, trading) are not modelled."
      actions={<Tabs label="Show" value={mode} onChange={setMode} tabs={[{ key: 'amount', label: 'Amount' }, { key: 'share', label: 'Share %' }]} />}>
      <div className="px-4 pb-4">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }} barCategoryGap="22%">
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickFormatter={(m) => monthLabel(m)} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={8} />
              <YAxis tickFormatter={mode === 'amount' ? rmAxis : (v) => `${v}%`} domain={mode === 'amount' ? [0, 'auto'] : [0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={mode === 'amount' ? 70 : 44} />
              <Tooltip cursor={{ fill: 'rgb(var(--sunken))' }} content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const m = months.find((x) => x.month === (payload[0].payload as { month: string }).month)!;
                const t = m.total as number;
                return <TipBox title={`${monthLong(m.month as string)} · ${rm(t)}`} rows={FEE_GROUPS.filter((g) => (m[g.key] as number) > 0).map((g) => ({
                  label: g.label, value: `${rm(m[g.key] as number)} · ${pct((m[g.key] as number) / (t || 1), 0)}`, color: FEE_VAR[FEE_GROUPS.indexOf(g)],
                }))} note={m.month === '2026-10' ? 'October to date' : undefined} />;
              }} />
              {FEE_GROUPS.map((g, i) => (
                <Bar key={g.key} dataKey={g.key} stackId="f" fill={FEE_VAR[i]} stroke="rgb(var(--surface))" strokeWidth={1.5} radius={i === FEE_GROUPS.length - 1 ? [4, 4, 0, 0] : 0} isAnimationActive={false} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <table className="mt-3 w-full text-[12.5px]">
          <caption className="sr-only">Revenue by fee type, year to date</caption>
          <thead><tr className="text-[11px] uppercase tracking-[0.08em] text-ink-3">
            <th scope="col" className="pb-1 text-left font-semibold">Fee type</th><th scope="col" className="pb-1 text-right font-semibold">2026 to date</th><th scope="col" className="pb-1 text-right font-semibold">Share</th>
          </tr></thead>
          <tbody>
            {FEE_GROUPS.map((g, i) => {
              const v = ytd.reduce((a, m) => a + (m[g.key] as number), 0);
              return (
                <tr key={g.key} className="border-t border-line/60">
                  <th scope="row" className="py-1.5 text-left font-normal"><span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: FEE_VAR[i] }} />{g.label}<span className="hidden text-ink-3 lg:inline">· {g.note}</span></span></th>
                  <td className="num py-1.5 text-right">{rm(v)}</td>
                  <td className="num w-16 py-1.5 text-right font-semibold">{pct(v / ytdTotal, 0)}</td>
                </tr>
              );
            })}
            <tr className="border-t border-line font-semibold"><th scope="row" className="py-1.5 text-left">Total</th><td className="num py-1.5 text-right">{rm(ytdTotal)}</td><td className="num py-1.5 text-right">100%</td></tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function TopRevenue({ stats }: { stats: TrancheStats[] }) {
  const { openDrawer, thresholds } = useApp();
  const fees = feesByTranche(thresholds);
  const top = stats.map((s) => ({ s, f: fees.get(s.tranche.id) })).filter((x) => x.f && x.f.total > 0).sort((a, b) => b.f!.total - a.f!.total).slice(0, 6);
  return (
    <Panel icon={Trophy} title="Top revenue tranches" info="All fees earned per tranche to date. The bar shows the fee mix.">
      <ol className="divide-y divide-line/70 px-6 pb-4">
        {top.map(({ s, f }, i) => (
          <li key={s.tranche.id}>
            <button onClick={() => openDrawer({ kind: 'tranche', id: s.tranche.id })} className="-mx-2 w-[calc(100%+1rem)] rounded-lg px-2 py-2.5 text-left hover:bg-sunken/70">
              <span className="flex items-center gap-3">
                <span className="num grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sunken text-[12.5px] font-semibold">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{s.tranche.name}</span>
                <span className="num shrink-0 font-display text-[16px] font-semibold">{rm(f!.total)}</span>
              </span>
              <span className="ml-10 mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-sunken" aria-hidden>
                {FEE_GROUPS.map((g, k) => <span key={g.key} style={{ width: `${(f![g.key] / f!.total) * 100}%`, background: FEE_VAR[k] }} />)}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

// ---------- Pipeline ------------------------------------------------------------------------

const STAGE_TINT = [
  'bg-violet-soft text-violet', 'bg-info-soft text-info', 'bg-good-soft text-good', 'bg-warn-soft text-warn', 'bg-accent-soft text-accent-ink', 'bg-crit-soft text-crit',
];
const CHEVRON_FIRST = 'polygon(0 0, calc(100% - 16px) 0, 100% 50%, calc(100% - 16px) 100%, 0 100%)';
const CHEVRON = 'polygon(0 0, calc(100% - 16px) 0, 100% 50%, calc(100% - 16px) 100%, 0 100%, 16px 50%)';

/** Read-only tranche card on hover, like the Executive Overview (no drawer). */
function TrancheHover({ s, x, y }: { s: TrancheStats; x: number; y: number }) {
  const { thresholds } = useApp();
  const fee = feesByTranche(thresholds).get(s.tranche.id)?.total ?? 0;
  const t = s.tranche;
  const live = s.indicative || t.stage === 'Upcoming';
  const facts: [string, string][] = [
    ['Issuer', issuerShort(t.issuerId)],
    ['Stage', t.stage],
    [live ? 'Closes' : 'Closed', `${dateShort(t.closeDate)} ${t.closeDate.slice(0, 4)}`],
    [t.stage === 'Upcoming' ? 'Target (not open yet)' : live ? 'Subscribed so far' : 'Raised', t.stage === 'Upcoming' ? rm(t.target) : `${rm(live ? s.pending : s.successful)} of ${rm(t.target)}`],
    ['Fee rate · profit rate', `${pct(t.feeRate, 2)} · ${pct(t.profitRate, 1)}`],
    ['Tenor · maturity', `${t.tenorMonths}m · ${dateShort(t.maturityDate)} ${t.maturityDate.slice(0, 4)}`],
    ['Fees earned to date', rm(fee)],
  ];
  return (
    <div role="tooltip" className="pointer-events-none fixed z-[80] w-[284px] rounded-xl border border-line bg-surface p-3.5 text-[12.5px] shadow-lift" style={{ left: Math.min(x + 16, window.innerWidth - 300), top: Math.min(y + 16, window.innerHeight - 250) }}>
      <div className="mb-2 font-semibold">{t.name} <span className="font-normal text-ink-3">· {t.id}</span></div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">{facts.map(([k, v]) => <Fragment key={k}><dt className="text-ink-3">{k}</dt><dd className="num text-right">{v}</dd></Fragment>)}</dl>
    </div>
  );
}

function Pipeline({ stats, stage, setStage }: { stats: TrancheStats[]; stage: string; setStage: (s: string) => void }) {
  const [tip, setTip] = useState<{ s: TrancheStats; x: number; y: number } | null>(null);
  return (
    <Panel icon={Workflow} title="Tranche pipeline" info="Every tranche by stage. Click a stage to show only its tranches in the table below; hover a tranche name for its details.">
      <ol className="grid grid-cols-1 gap-3 px-6 pb-5 sm:grid-cols-3 min-[1400px]:grid-cols-6 min-[1400px]:gap-0">
        {TRANCHE_STAGES.map((st, k) => {
          const inStage = stats.filter((s) => s.tranche.stage === st).sort((a, b) => b.tranche.closeDate.localeCompare(a.tranche.closeDate));
          const amount = inStage.reduce((a, s) => a + (s.indicative || s.tranche.stage === 'Upcoming' ? s.pending : s.successful), 0);
          const active = stage === st;
          return (
            <li key={st} className="min-w-0 min-[1400px]:-ml-2 min-[1400px]:first:ml-0">
              <button onClick={() => { setStage(active ? '' : st); document.getElementById('payments')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} aria-pressed={active}
                style={{ clipPath: k === 0 ? CHEVRON_FIRST : CHEVRON }}
                className={`flex h-[74px] w-full items-center justify-between gap-2 rounded-l-xl py-2 text-left transition-[filter] hover:brightness-95 max-[1399px]:![clip-path:none] max-[1399px]:rounded-xl ${k === 0 ? 'pl-4' : 'pl-6 min-[1400px]:pl-8'} pr-7 ${STAGE_TINT[k]} ${active ? 'brightness-90 saturate-150' : stage ? 'opacity-60' : ''}`}>
                <span>
                  <span className="block text-[13.5px] font-semibold text-ink">{STAGE_LABEL[st] === 'Matured / redeemed' ? 'Redemption' : STAGE_LABEL[st] ?? st}</span>
                  <span className="block text-[12px] text-ink-2">{inStage.length} tranche{inStage.length === 1 ? '' : 's'}</span>
                  <span className="num block text-[13px] font-semibold text-ink">{rmShort(amount)}</span>
                </span>
                <ChevronRight size={16} className="shrink-0 opacity-70" aria-hidden />
              </button>
              <ul className={`mt-2 space-y-0.5 text-[12.5px] ${k === 0 ? 'pl-4' : 'pl-4 min-[1400px]:pl-8'} pr-4`}>
                {inStage.slice(0, 2).map((s) => (
                  <li key={s.tranche.id} className="truncate">
                    <span tabIndex={0} onMouseMove={(e) => setTip({ s, x: e.clientX, y: e.clientY })} onMouseLeave={() => setTip(null)}
                      onFocus={(e) => { const r = e.currentTarget.getBoundingClientRect(); setTip({ s, x: r.left, y: r.bottom }); }} onBlur={() => setTip(null)}
                      className="cursor-default text-ink-2 underline decoration-dotted decoration-ink-3/60 underline-offset-2 hover:text-ink">{s.tranche.name}</span>
                  </li>
                ))}
                {inStage.length > 2 && <li className="text-[12px] text-ink-3">+{inStage.length - 2} more</li>}
                {inStage.length === 0 && <li className="text-[12px] text-ink-3">None</li>}
              </ul>
            </li>
          );
        })}
      </ol>
      {tip && <TrancheHover s={tip.s} x={tip.x} y={tip.y} />}
    </Panel>
  );
}

// ---------- Company P&L ---------------------------------------------------------------------

const LINES: { key: keyof PnlView; label: string; budget?: 'revenue' | 'opex' | 'ebitda' | 'netResult'; strong?: boolean; cost?: boolean }[] = [
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

/** P&L as uploaded: reported revenue replaces the tranche calculation, and profit lines move with it. */
/** P&L as uploaded: reported revenue against the all-fee calculation; profit lines move with reported revenue. */
function reportedView(month: string, th: Parameters<typeof pnlView>[1]) {
  const p = pnlView(month, th);
  if (!p) return null;
  const calculated = (feesByMonth(th, [month])[0].total as number);
  const reported = calculated + (REPORTED_ADJUST[month] ?? 0);
  const d = reported - p.revenue;
  return { ...p, calculated, revenue: reported, ebitda: p.ebitda + d, netResult: p.netResult + d };
}

function CompanyPnl() {
  const { thresholds, toast } = useApp();
  const months = closedPnl(thresholds);
  const [sel, setSel] = useState(LATEST_CLOSED_PNL_MONTH);
  const [metric, setMetric] = useState<'ebitda' | 'netResult'>('ebitda');
  const [drag, setDrag] = useState(false);
  const p = reportedView(sel, thresholds)!;
  const prevKey = months[months.findIndex((m) => m.month === sel) - 1]?.month;
  const prev = prevKey ? reportedView(prevKey, thresholds) : null;
  const variance = p.revenue - p.calculated;
  const mockUpload = () => toast('Prototype: the file was not read. P&L upload is not connected yet.', 'info');
  const history = [...months].reverse().slice(0, 4);

  return (
    <Panel icon={FileSpreadsheet} title="Company P&L" info="Finance uploads the month-end P&L. Revenue is shown as reported and against the dashboard's all-fee calculation, with any difference flagged. Upload is not connected in this prototype."
>
      <div className="grid grid-cols-1 gap-6 px-6 pb-6 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-4">
          <div role="button" tabIndex={0} onClick={mockUpload} onKeyDown={(e) => { if (e.key === 'Enter') mockUpload(); }}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); mockUpload(); }}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-5 py-7 text-center transition-colors ${drag ? 'border-accent bg-accent-soft' : 'border-accent/40 bg-accent-soft/40 hover:bg-accent-soft/70'}`}>
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-surface text-accent shadow-sm"><Upload size={22} aria-hidden /></span>
            <span className="text-[14px] font-semibold">Upload monthly P&L</span>
            <span className="text-[12.5px] text-ink-2">Drag & drop or click to browse</span>
            <span className="text-[11.5px] text-ink-3">Excel (.xlsx) or CSV · company P&L template</span>
          </div>
          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">Uploaded</div>
            <ul className="divide-y divide-line/70 text-[12.5px]">
              {history.map((m, i) => (
                <li key={m.month}>
                  <button onClick={() => setSel(m.month)} className={`-mx-2 flex w-[calc(100%+1rem)] items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-sunken/70 ${sel === m.month ? 'bg-sunken' : ''}`}>
                    <FileSpreadsheet size={16} className="shrink-0 text-good" aria-hidden />
                    <span className="min-w-0 flex-1"><span className="block font-medium">{monthLong(m.month)} P&L.xlsx</span><span className="block text-[11.5px] text-ink-3">Uploaded {dateShort(addMonths(`${m.month}-07`, 1))} · Finance · 11 lines matched</span></span>
                    {i === 0 && <span className="rounded-full bg-good-soft px-2 py-0.5 text-[11px] font-semibold text-good">Latest</span>}
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11.5px] text-ink-3">Synthetic examples. October closes after month-end.</p>
          </div>
        </div>

        <div className="min-w-0 xl:col-span-8">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <Select id="pnl-month" label="Month" value={sel} onChange={setSel} options={[...months].reverse().map((m) => ({ value: m.month, label: monthLong(m.month) }))} />
            {Math.abs(variance) > VARIANCE_FLAG && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-warn-soft px-3 py-1.5 text-[12.5px] font-semibold text-warn"><AlertTriangle size={14} aria-hidden />Reported revenue differs from the fee calculation by {rm(Math.abs(variance))}</span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-[13px]">
              <caption className="sr-only">P&L for {monthLong(sel)}</caption>
              <thead><tr className="border-b border-line text-[11.5px] text-ink-2">
                <th scope="col" className="py-2 pr-3 text-left font-semibold">Line</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">{monthLong(sel)}</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Budget</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Variance</th>
                <th scope="col" className="py-2 pl-3 text-right font-semibold">{prev ? monthLong(prev.month) : 'Previous'}</th>
              </tr></thead>
              <tbody>
                <tr className="border-b border-line/70 bg-sunken/50 font-semibold">
                  <th scope="row" className="py-2 pr-3 text-left">Revenue (P&L reported)</th>
                  <td className="num px-3 py-2 text-right">{rm(p.revenue)}</td>
                  <td className="num px-3 py-2 text-right text-ink-2">{rm(p.budget.revenue)}</td>
                  <td className={`num px-3 py-2 text-right ${p.revenue >= p.budget.revenue ? 'text-good' : 'text-crit'}`}>{signed(p.revenue - p.budget.revenue, rm)}</td>
                  <td className="num py-2 pl-3 text-right text-ink-2">{prev ? rm(prev.revenue) : '—'}</td>
                </tr>
                <tr className="border-b border-line/70 text-ink-2">
                  <th scope="row" className="py-1.5 pl-3 pr-3 text-left font-normal">Calculated from fees (all types)</th>
                  <td className="num px-3 py-1.5 text-right">{rm(p.calculated)}</td>
                  <td className="px-3 py-1.5" /><td className="px-3 py-1.5" />
                  <td className="num py-1.5 pl-3 text-right">{prev ? rm(prev.calculated) : '—'}</td>
                </tr>
                <tr className={`border-b border-line/70 ${Math.abs(variance) > VARIANCE_FLAG ? 'bg-warn-soft/60 font-semibold text-warn' : 'text-ink-2'}`}>
                  <th scope="row" className="py-1.5 pl-3 pr-3 text-left font-normal">Difference (reported − calculated)</th>
                  <td className="num px-3 py-1.5 text-right">{signed(variance, rm)}</td>
                  <td className="px-3 py-1.5" /><td className="px-3 py-1.5" />
                  <td className="num py-1.5 pl-3 text-right">{prev ? signed(prev.revenue - prev.calculated, rm) : '—'}</td>
                </tr>
                {LINES.map((l) => {
                  const a = p[l.key] as number;
                  const b = l.budget ? p.budget[l.budget] : null;
                  const varc = b === null ? null : a - b;
                  const good = varc === null ? null : l.cost ? varc <= 0 : varc >= 0;
                  const pv = prev ? (prev[l.key] as number) : null;
                  return (
                    <tr key={l.key} className={`border-b border-line/70 ${l.strong ? 'bg-sunken/50 font-semibold' : ''}`}>
                      <th scope="row" className={`py-2 pr-3 text-left ${l.strong ? 'font-semibold' : 'pl-3 font-normal text-ink-2'}`}>{l.label}</th>
                      <td className="num whitespace-nowrap px-3 py-2 text-right">{rm(l.cost ? -a : a)}</td>
                      <td className="num whitespace-nowrap px-3 py-2 text-right text-ink-2">{b === null ? '—' : rm(l.cost ? -b : b)}</td>
                      <td className={`num whitespace-nowrap px-3 py-2 text-right ${good === null ? 'text-ink-3' : good ? 'text-good' : 'text-crit'}`}>{varc === null ? '—' : signed(l.cost ? -varc : varc, rm)}</td>
                      <td className="num whitespace-nowrap py-2 pl-3 text-right text-ink-2">{pv === null ? '—' : rm(l.cost ? -pv : pv)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="xl:col-span-12">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-[13px] font-semibold">12-month trend <InfoTip text="Spot trends: revenue against operating costs and the chosen profit measure. Hover a month for values." /></h3>
            <Tabs label="Profit measure on chart" value={metric} onChange={setMetric} tabs={[{ key: 'ebitda', label: 'EBITDA' }, { key: 'netResult', label: 'Net result' }]} />
          </div>
          <PnlTrend data={trendSeries(thresholds).map((t) => {
            const fee = feesByMonth(thresholds, [t.month])[0].total as number;
            const d = fee - t.revenue;
            return { ...t, revenue: fee, ebitda: t.ebitda === null ? null : t.ebitda + d, netResult: t.netResult === null ? null : t.netResult + d };
          })} metric={metric} height={280} />
        </div>
      </div>
    </Panel>
  );
}
