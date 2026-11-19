import { AlertTriangle, CalendarDays, ChevronRight, Coins, ListChecks, Target, User, Users, UsersRound } from 'lucide-react';
import { Fragment, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { HeroKpi, Panel } from '../components/ui/Showcase';
import { deltaAbs, deltaPct } from '../components/ui/KpiCard';
import { AS_OF, TREND_MONTHS, daysFromAsOf, monthEnd } from '../data/asOf';
import { date, dateShort, int, pct, rm, rmShort } from '../lib/format';
import type { LinkTarget } from '../lib/nav';
import { monthsIn } from '../lib/period';
import type { Alert } from '../lib/selectors/alerts';
import { timelineEvents, type TimelineEvent } from '../lib/selectors/ops';
import { compareDate } from '../lib/selectors/common';
import { issuerShort, periodFinance, trendSeries } from '../lib/selectors/finance';
import { subscriptionProgress, type ProgressRow } from '../lib/selectors/operations';
import { activeInvestors, allInvestorMetrics } from '../lib/selectors/investors';
import { useApp } from '../state/AppState';
import { useFillHeight, useFitCount } from '../hooks/useFit';

/** Alert titles without the trailing status words, which the due chip already shows. */
export function shortTitle(a: Alert): string {
  return a.title
    .replace(/ — (overdue|blocked|awaiting CEO decision|preparation deadline missed|\d+% ready for Board)$/, '')
    .replace(/^(Critical|High) cyber risk with overdue treatment: /, 'Cyber risk: ')
    .replace(/ \(synthetic\)$/, '');
}

/** Read-only detail shown while hovering a tranche row; clicking goes to Investor Operations. */
function TrancheHoverCard({ row: s, x, y }: { row: ProgressRow; x: number; y: number }) {
  const days = daysFromAsOf(s.tranche.closeDate);
  const left = Math.min(x + 16, window.innerWidth - 300);
  const top = Math.min(y + 16, window.innerHeight - 230);
  const facts: [string, string][] = [
    ['Issuer', issuerShort(s.tranche.issuerId)],
    ['Opens', date(s.tranche.openDate)],
    [days >= 0 ? 'Days to close' : 'Closed', days >= 0 ? `${days}` : `${-days} days ago`],
    ['Gross requests', rm(s.gross)],
    ['Subscribers', `${s.subscribers}`],
    ...(s.dailyPace !== null ? [['Daily pace', `${rm(s.dailyPace)}/day`] as [string, string]] : []),
  ];
  return (
    <div role="tooltip" className="pointer-events-none fixed z-[80] w-[280px] rounded-xl border border-line bg-surface p-3.5 text-[12.5px] shadow-lift" style={{ left, top }}>
      <div className="mb-2 font-semibold">{s.tranche.name}</div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        {facts.map(([k, v]) => <Fragment key={k}><dt className="text-ink-3">{k}</dt><dd className="num text-right">{v}</dd></Fragment>)}
      </dl>
      <div className="mt-2.5 border-t border-line pt-2 text-[11.5px] text-accent-ink">Click for full detail in Investor Operations</div>
    </div>
  );
}

const VERDICT: Record<NonNullable<ProgressRow['verdict']>, { cls: string; bar: string }> = {
  Filled: { cls: 'bg-good-soft text-good', bar: 'bg-good' },
  'On pace': { cls: 'bg-good-soft text-good', bar: 'bg-accent' },
  'Close call': { cls: 'bg-warn-soft text-warn', bar: 'bg-warn' },
  'At risk': { cls: 'bg-crit-soft text-crit', bar: 'bg-crit' },
};

/** Compact money for the summary line, e.g. RM 1.84m. */
const rmM = (n: number) => `RM ${(n / 1e6).toFixed(2)}m`;

/** One live tranche: verdict, a bar with the straight-line estimate to close, and the target tick. */
function ProgressBlock({ s, onOpen, onTip }: { s: ProgressRow; onOpen: (id: string) => void; onTip: (t: { row: ProgressRow; x: number; y: number } | null) => void }) {
  const v = s.verdict ?? 'On pace';
  const target = s.tranche.target;
  const projected = s.projectedAtClose ?? s.raised;
  const scale = Math.max(1, Math.min(1.25, Math.max(s.raised, projected) / target));
  const w = (n: number) => `${Math.min(100, (n / target / scale) * 100)}%`;
  const days = daysFromAsOf(s.tranche.closeDate);
  const label = v === 'Filled' ? (s.raised > target ? 'Oversubscribed' : 'Filled') : v;
  // Above 100% the straight-line estimate is not meaningful as a number; say it is on pace to fill.
  const tail = v === 'Filled' ? `${pct(s.raised / target, 0)} of target` : projected >= target ? 'on pace to fill' : `~${pct(projected / target, 0)} at close`;
  return (
    <li data-fit>
      <div role="button" tabIndex={0} aria-label={`${s.tranche.id} ${s.tranche.name}: ${pct(s.fulfilment, 0)} of target, ${label}. Open in Investor Operations.`}
        onClick={() => onOpen(s.tranche.id)} onKeyDown={(e) => { if (e.key === 'Enter') onOpen(s.tranche.id); }}
        onMouseMove={(e) => onTip({ row: s, x: e.clientX, y: e.clientY })} onMouseLeave={() => onTip(null)}
        className="-mx-3 cursor-pointer rounded-xl px-3 py-2 hover:bg-sunken/70 focus-visible:bg-sunken focus-visible:outline-none">
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 text-[13.5px] sm:truncate"><span className="font-semibold">{s.tranche.id}</span> <span className="text-ink-2">{s.tranche.name}</span></span>
          <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${VERDICT[v].cls}`}><span className="h-2 w-2 rounded-full bg-current" aria-hidden />{label}</span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="num w-11 shrink-0 font-display text-[18px] font-semibold leading-none">{pct(s.fulfilment, 0)}</span>
          <div className="relative h-2.5 min-w-[120px] flex-1 overflow-hidden rounded-full bg-sunken" aria-hidden>
            {projected > s.raised && <div className={`absolute inset-y-0 left-0 rounded-full opacity-25 ${VERDICT[v].bar}`} style={{ width: w(projected) }} />}
            <div className={`absolute inset-y-0 left-0 rounded-full ${VERDICT[v].bar}`} style={{ width: w(s.raised) }} />
            <div className="absolute inset-y-[-2px] w-0.5 bg-ink/60" style={{ left: `calc(${(1 / scale) * 100}% - 1px)` }} title="Target" />
          </div>
          <span className="num basis-full text-[12px] text-ink-3 xl:w-[18.5rem] xl:basis-auto xl:whitespace-nowrap">
            {rmM(s.raised)} of {rmM(target)} · {days > 0 ? `${days} day${days === 1 ? '' : 's'} left` : 'closes today'} · {tail}
          </span>
        </div>
      </div>
    </li>
  );
}

function DueChip({ a }: { a: Alert }) {
  if (!a.date) return <span className="inline-flex items-center gap-1.5 rounded-lg bg-warn-soft px-3 py-1.5 text-[13px] font-semibold text-warn"><AlertTriangle size={15} aria-hidden />Action needed</span>;
  const d = daysFromAsOf(a.date);
  if (a.dateKind === 'since') return <span className="num inline-flex items-center gap-1.5 rounded-lg bg-warn-soft px-3 py-1.5 text-[13px] font-semibold text-warn"><AlertTriangle size={15} aria-hidden />Open {-d} day{d === -1 ? '' : 's'}</span>;
  if (d < 0) return <span className="num inline-flex items-center gap-1.5 rounded-lg bg-crit-soft px-3 py-1.5 text-[13px] font-semibold text-crit"><AlertTriangle size={15} aria-hidden />{-d} day{d === -1 ? '' : 's'} overdue</span>;
  if (d <= 7) return <span className="num inline-flex items-center gap-1.5 rounded-lg bg-warn-soft px-3 py-1.5 text-[13px] font-semibold text-warn"><AlertTriangle size={15} aria-hidden />{d === 0 ? 'Due today' : `Due in ${d} day${d === 1 ? '' : 's'}`}</span>;
  return <span className="num inline-flex items-center gap-1.5 rounded-lg bg-sunken px-3 py-1.5 text-[13px] font-semibold text-ink-2"><CalendarDays size={15} aria-hidden />{date(a.date)}</span>;
}

/** Milestone dot colour by risk, so the riskiest event stands out. */
const RISK_DOT: Record<TimelineEvent['risk'], string> = { Critical: 'bg-crit', High: 'bg-warn', Medium: 'bg-violet', Low: 'bg-info' };

export function OverviewPage() {
  const { period, thresholds, alerts, navigate } = useApp();
  const [hover, setHover] = useState<string | null>(null);

  const fin = periodFinance(period, thresholds);
  const cmpFin = period.compare ? periodFinance(period.compare, thresholds) : null;
  const trend = trendSeries(thresholds);
  const inPeriod = trend.filter((t) => monthsIn(period).includes(t.month));
  const budgetSubs = inPeriod.reduce((a, t) => a + (t.budgetSubs ?? 0), 0);
  const budgetRev = inPeriod.reduce((a, t) => a + (t.budgetRevenue ?? 0), 0);
  const cl = period.compare ? `vs ${period.compare.label.replace(/^same point in /, '').replace(/^(\w{3})\w* (\d{4})$/, '$1 $2')}` : 'vs budget';

  const at = period.end < AS_OF ? period.end : AS_OF;
  const cmp = compareDate(period);
  const act = activeInvestors(at);
  const recent = TREND_MONTHS.slice(-7);
  const investorSpark = recent.map((m) => activeInvestors(m === recent[recent.length - 1] ? AS_OF : monthEnd(m)).length);

  // Investor snapshot: every registered investor in exactly one group.
  const all = allInvestorMetrics();
  const groups = [
    { key: 'active', label: 'Active investors', sub: 'Hold a current subscription', n: all.filter((m) => m.currentCount > 0).length, color: 'var(--series-2)', link: { page: 'investors', params: { list: 'group:active' } } as LinkTarget },
    { key: 'idle', label: 'Approved, not invested', sub: 'Verified, no current subscription', n: all.filter((m) => m.currentCount === 0 && m.inv.approvedOn).length, color: 'var(--series-1)', link: { page: 'investors', params: { list: 'group:idle' } } as LinkTarget },
    { key: 'pending', label: 'Not yet verified', sub: 'Onboarding or awaiting approval', n: all.filter((m) => !m.inv.approvedOn).length, color: 'var(--series-muted)', link: { page: 'investors', params: { list: 'group:pending' } } as LinkTarget },
  ];
  const total = groups.reduce((a, g) => a + g.n, 0);

  // Executive view: live tranches with a verdict, then upcoming ones on a single line each. Closed tranches live in Investor Operations.
  const progressAll = subscriptionProgress(thresholds, 0);
  const current = progressAll.filter((r) => r.section === 'Current');
  const upcoming = progressAll.filter((r) => r.section === 'Upcoming');
  const [tip, setTip] = useState<{ row: ProgressRow; x: number; y: number } | null>(null);
  const openInOps = (id: string) => navigate({ page: 'investors', params: { tranche: id } });
  const milestonesAll = timelineEvents().filter((e) => e.date >= AS_OF);

  // Fill the screen when there is room; otherwise keep the compact lists and scroll.
  const fill = useFillHeight(820);
  const fitProgress = useFitCount(fill.height !== null, progressAll.length, progressAll.length);
  const fitMilestones = useFitCount(fill.height !== null, milestonesAll.length, 3);
  const fitDecisions = useFitCount(fill.height !== null, alerts.length, 3);
  const milestones = milestonesAll.slice(0, fitMilestones.count);
  const decisions = alerts.slice(0, fitDecisions.count);

  return (
    <div ref={fill.ref} className="flex flex-col gap-6" style={fill.height ? { height: fill.height } : undefined}>
      <div className="grid shrink-0 grid-cols-1 gap-5 lg:grid-cols-3">
        <HeroKpi icon={Users} tone="blue" label="Total subscriptions" value={rmShort(fin.successful)}
          delta={cmpFin ? deltaPct(fin.successful, cmpFin.successful, cl) : deltaPct(fin.successful, budgetSubs, 'vs budget')}
          spark={trend.slice(-7).map((t) => t.subs)} onClick={() => navigate({ page: 'finance' })}
          info={`Successful subscriptions in tranches closed ${period.label}. Budget ${rmShort(budgetSubs)}.`} />
        <HeroKpi icon={Coins} tone="teal" label="Revenue" value={rmShort(fin.revenue)}
          delta={cmpFin ? deltaPct(fin.revenue, cmpFin.revenue, cl) : deltaPct(fin.revenue, budgetRev, 'vs budget')}
          spark={trend.slice(-7).map((t) => t.revenue)} onClick={() => navigate({ page: 'finance' })}
          info={`Recognised revenue: successful subscription × tranche fee rate. Budget ${rmShort(budgetRev)}.`} />
        <HeroKpi icon={UsersRound} tone="violet" label="Active investors" value={int(act.length)}
          delta={deltaAbs(act.length, activeInvestors(cmp.at).length, period.compare ? cl : cmp.label, true)}
          spark={investorSpark} onClick={() => navigate({ page: 'investors' })}
          info="Investors holding at least one current subscription." />
      </div>

      <div className={`grid grid-cols-1 gap-5 xl:grid-cols-12 ${fill.height ? 'min-h-0 flex-1 grid-rows-[minmax(0,1fr)]' : ''}`}>
        <div className="min-h-0 min-w-0 xl:col-span-7">
          <Panel icon={Target} title="Subscription progress" info="Will each live tranche reach its target? Expected at close is a straight-line estimate from the average daily pace so far. Full detail is in Investor Operations.">
            {/* Nothing is hidden: if the card is shorter than the list, it scrolls inside the card. */}
            <div ref={fitProgress.ref} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 pb-3">
              <ul className="divide-y divide-line/70" aria-label="Live tranches">
                {current.map((s) => <ProgressBlock key={s.tranche.id} s={s} onOpen={openInOps} onTip={setTip} />)}
              </ul>
              {upcoming.length > 0 && (
                <ul data-fit className="mt-1 border-t border-line pt-1.5" aria-label="Upcoming tranches">
                  {upcoming.map((s) => (
                    <li key={s.tranche.id}>
                      <button onClick={() => openInOps(s.tranche.id)} aria-label={`${s.tranche.id} ${s.tranche.name}: opens ${date(s.tranche.openDate)}. Open in Investor Operations.`}
                        className="-mx-2 flex w-[calc(100%+1rem)] flex-wrap items-baseline gap-x-2 rounded-lg px-2 py-1 text-left text-[12.5px] hover:bg-sunken/70">
                        <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-3">Upcoming</span>
                        <span className="font-semibold">{s.tranche.id}</span>
                        <span className="text-ink-2">{s.tranche.name}</span>
                        <span className="num text-ink-3">· opens {dateShort(s.tranche.openDate)} · {rmM(s.tranche.target)} target</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {tip && <TrancheHoverCard row={tip.row} x={tip.x} y={tip.y} />}
          </Panel>
        </div>

        <div className="min-h-0 min-w-0 xl:col-span-5">
          <Panel icon={User} title="Investor snapshot">
            <div className="flex flex-1 flex-col items-center gap-6 px-6 pb-6 sm:flex-row">
              <div className="relative h-[180px] w-[180px] shrink-0 2xl:h-[220px] 2xl:w-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={groups} dataKey="n" nameKey="label" innerRadius="74%" outerRadius="98%" startAngle={90} endAngle={-270} stroke="rgb(var(--surface))" strokeWidth={2}
                      isAnimationActive={false} onClick={(d) => navigate((d as unknown as { link: LinkTarget }).link)} style={{ cursor: 'pointer' }}
                      onMouseEnter={(_, i) => setHover(groups[i].key)} onMouseLeave={() => setHover(null)}>
                      {groups.map((g) => <Cell key={g.key} fill={g.color} fillOpacity={hover && hover !== g.key ? 0.25 : 1} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                  <span>
                    <span className="num block font-display text-[38px] font-semibold leading-none 2xl:text-[46px]">{(groups.find((g) => g.key === hover) ?? groups[0]).n}</span>
                    <span className="mx-auto mt-1 block max-w-[120px] text-[14px] leading-snug text-ink-2">{(groups.find((g) => g.key === hover) ?? groups[0]).label}</span>
                  </span>
                </div>
              </div>
              <ul className="w-full flex-1 divide-y divide-line">
                {groups.map((g) => (
                  <li key={g.key}>
                    <button onClick={() => navigate(g.link)} onMouseEnter={() => setHover(g.key)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(g.key)} onBlur={() => setHover(null)}
                      className={`-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors ${hover === g.key ? 'bg-sunken' : ''} ${hover && hover !== g.key ? 'opacity-50' : ''}`}>
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: g.color }} aria-hidden />
                      <span className="min-w-0 flex-1 text-[13.5px] leading-snug">{g.label}</span>
                      <span className="num w-8 text-right font-display text-[22px] font-semibold">{g.n}</span>
                      <span className="num w-11 text-right text-[14px] text-ink-3">{pct(g.n / total, 0)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </Panel>
        </div>

      </div>

      <div className={`grid grid-cols-1 gap-5 xl:grid-cols-12 ${fill.height ? 'min-h-0 flex-1 grid-rows-[minmax(0,1fr)]' : ''}`}>
        <div className="min-h-0 min-w-0 xl:col-span-5">
          <Panel icon={CalendarDays} title="Upcoming milestones" iconTile="violet">
            <div ref={fitMilestones.ref} className="min-h-0 flex-1 overflow-hidden">
            <ol className="relative px-6 pb-4">
              {milestones.map((m, i) => (
                <li key={m.id} data-fit className="relative">
                  {i < milestones.length - 1 && <span className="absolute left-[5px] top-[34px] h-[calc(100%-12px)] w-0.5 bg-line" aria-hidden />}
                  <button onClick={() => navigate({ page: 'issuers', drawer: { kind: 'issuer', id: m.issuerId } })} className={`flex w-full items-center gap-4 py-4 text-left hover:opacity-80 ${i ? 'border-t border-line' : ''}`}>
                    <span className={`relative z-10 h-3 w-3 shrink-0 rounded-full ring-4 ring-surface ${RISK_DOT[m.risk]}`} aria-hidden />
                    <span className="num w-28 shrink-0 text-[15px] font-semibold">{date(m.date)}</span>
                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium" title={`${m.title} · ${m.type} · ${m.risk} risk`}>{m.title}</span>
                    <ChevronRight size={18} className="shrink-0 text-ink-3" aria-hidden />
                  </button>
                </li>
              ))}
            </ol>
            </div>
          </Panel>
        </div>

        <div className="min-h-0 min-w-0 xl:col-span-7">
          <Panel icon={ListChecks} title="Priority decisions">
            <div ref={fitDecisions.ref} className="min-h-0 flex-1 overflow-hidden">
            <ol className="px-6 pb-4">
              {decisions.map((a, i) => (
                <li key={a.id} data-fit>
                  <button onClick={() => navigate(a.link)} aria-label={`Open record: ${a.title}`}
                    className={`flex w-full flex-wrap items-center gap-x-4 gap-y-2 py-4 text-left hover:opacity-80 ${i ? 'border-t border-line' : ''}`}>
                    <span className="num grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sunken text-[15px] font-semibold">{i + 1}</span>
                    <span className="min-w-0 flex-1 basis-56 text-[15px] font-semibold leading-snug" title={`${a.severity} · ${a.area} · ${a.owner}`}>{shortTitle(a)}</span>
                    <DueChip a={a} />
                    <ChevronRight size={18} className="shrink-0 text-ink-3" aria-hidden />
                  </button>
                </li>
              ))}
            </ol>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
