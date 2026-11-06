import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, CalendarDays, ChevronRight, Coins, ListChecks, Target, User, Users, UsersRound, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { Sparkline } from '../components/charts/Sparkline';
import { DataTable } from '../components/ui/DataTable';
import { MoneyValue, deltaAbs, deltaPct, type KpiDelta } from '../components/ui/KpiCard';
import { Progress } from '../components/ui/Primitives';
import { AS_OF, TREND_MONTHS, daysFromAsOf, monthEnd } from '../data/asOf';
import { date, int, pct, rm, rmShort } from '../lib/format';
import type { LinkTarget } from '../lib/nav';
import { monthsIn } from '../lib/period';
import type { Alert } from '../lib/selectors/alerts';
import { timelineEvents, type TimelineEvent } from '../lib/selectors/ops';
import { compareDate } from '../lib/selectors/common';
import { allTrancheStats, periodFinance, trendSeries, type TrancheStats } from '../lib/selectors/finance';
import { activeInvestors, allInvestorMetrics } from '../lib/selectors/investors';
import { useApp } from '../state/AppState';

/** Alert titles without the trailing status words, which the due chip already shows. */
export function shortTitle(a: Alert): string {
  return a.title
    .replace(/ — (overdue|blocked|awaiting CEO decision|preparation deadline missed|\d+% ready for Board)$/, '')
    .replace(/^(Critical|High) cyber risk with overdue treatment: /, 'Cyber risk: ')
    .replace(/ \(synthetic\)$/, '');
}

const TILE: Record<'blue' | 'teal' | 'violet', { tile: string; line: string }> = {
  blue: { tile: 'bg-info-soft text-info', line: 'rgb(var(--info))' },
  teal: { tile: 'bg-good-soft text-good', line: 'var(--series-2)' },
  violet: { tile: 'bg-violet-soft text-violet', line: 'rgb(var(--violet))' },
};

function HeroKpi({ icon: Icon, tone, label, value, delta, spark, onClick, info }: {
  icon: LucideIcon; tone: keyof typeof TILE; label: string; value: string; delta?: KpiDelta; spark: number[]; onClick: () => void; info: string;
}) {
  const D = delta?.direction === 'up' ? ArrowUpRight : delta?.direction === 'down' ? ArrowDownRight : ArrowRight;
  const dcls = delta?.good === true ? 'text-good' : delta?.good === false ? 'text-crit' : 'text-ink-3';
  return (
    <button onClick={onClick} title={info} aria-label={`${label}: ${value}. ${info}`}
      className="card flex min-w-0 items-center gap-4 px-5 py-5 text-left transition-shadow hover:shadow-lift">
      <span className={`grid h-14 w-14 shrink-0 place-items-center self-start rounded-2xl ${TILE[tone].tile}`}><Icon size={26} aria-hidden /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-ink">{label}</span>
        <span className="num mt-1 block whitespace-nowrap font-display text-[30px] font-semibold leading-tight tracking-tight"><MoneyValue v={value} /></span>
        {delta && <span className={`mt-1 flex items-center gap-1 whitespace-nowrap text-[13.5px] font-semibold ${dcls}`}><D size={16} aria-hidden />{delta.text}</span>}
      </span>
      <span className="hidden self-end sm:block"><Sparkline values={spark} width={84} height={48} color={TILE[tone].line} /></span>
    </button>
  );
}

function Panel({ icon: Icon, title, children, iconTile = false }: { icon: LucideIcon; title: string; children: ReactNode; iconTile?: boolean }) {
  return (
    <section className="card flex h-full min-w-0 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-3 px-6 pb-3 pt-5">
        {iconTile
          ? <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-soft text-violet"><Icon size={20} aria-hidden /></span>
          : <Icon size={24} className="text-ink" aria-hidden />}
        <h2 className="font-display text-[21px] font-semibold tracking-tight">{title}</h2>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}

function statusOf(s: TrancheStats): { label: string; cls: string } {
  if (s.tranche.stage === 'Upcoming') return { label: 'Not open', cls: 'bg-mute-soft text-mute' };
  if (s.risk === 'Critical' || s.risk === 'Attention') return { label: 'At risk', cls: 'bg-crit-soft text-crit' };
  if (s.tranche.stage === 'Fully Subscribed') return { label: 'Fully subscribed', cls: 'bg-good-soft text-good' };
  return { label: 'On track', cls: 'bg-good-soft text-good' };
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
  const { period, thresholds, alerts, navigate, openDrawer } = useApp();
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
    { key: 'active', label: 'Active investors', sub: 'Hold a current subscription', n: all.filter((m) => m.currentCount > 0).length, color: 'var(--series-2)', link: { page: 'investors' } as LinkTarget },
    { key: 'idle', label: 'Approved, not invested', sub: 'Verified, no current subscription', n: all.filter((m) => m.currentCount === 0 && m.inv.approvedOn).length, color: 'var(--series-1)', link: { page: 'investors', params: { tab: 'deposits' } } as LinkTarget },
    { key: 'pending', label: 'Not yet verified', sub: 'Onboarding or awaiting approval', n: all.filter((m) => !m.inv.approvedOn).length, color: 'var(--series-muted)', link: { page: 'investors', params: { stage: 'incomplete' } } as LinkTarget },
  ];
  const total = groups.reduce((a, g) => a + g.n, 0);

  const progress = allTrancheStats(thresholds)
    .filter((s) => ['Upcoming', 'Open', 'Fully Subscribed'].includes(s.tranche.stage))
    .sort((a, b) => a.tranche.closeDate.localeCompare(b.tranche.closeDate));
  const milestones = timelineEvents().filter((e) => e.date >= AS_OF).slice(0, 3);
  const decisions = alerts.slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
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

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-7">
          <Panel icon={Target} title="Subscription progress">
            <div className="px-3">
              <DataTable<TrancheStats> caption="Subscription progress for live and upcoming tranches" rows={progress} rowKey={(s) => s.tranche.id}
                onRowClick={(s) => openDrawer({ kind: 'tranche', id: s.tranche.id })}
                columns={[
                  { key: 'n', header: 'Tranche', render: (s) => <span className="whitespace-nowrap"><span className="block font-semibold">{s.tranche.id}</span><span className="block text-[12px] text-ink-3">{s.tranche.name}</span></span> },
                  { key: 't', header: 'Target raise', align: 'right', render: (s) => rm(s.tranche.target) },
                  { key: 'r', header: 'Raised so far', align: 'right', render: (s) => rm(s.pending) },
                  { key: 'p', header: 'Progress', render: (s) => (
                    <span className="flex min-w-[140px] items-center gap-2.5"><span className="num w-10 font-semibold">{pct(s.fulfilment, 0)}</span><span className="flex-1"><Progress value={s.fulfilment} tone={s.risk === 'Critical' || s.risk === 'Attention' ? 'crit' : 'accent'} label={`${s.tranche.name} progress`} /></span></span>
                  ) },
                  { key: 'c', header: 'Closing date', render: (s) => <span className="num whitespace-nowrap">{date(s.tranche.closeDate)}</span> },
                  { key: 's', header: 'Status', render: (s) => { const st = statusOf(s); return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-medium ${st.cls}`}><span className="h-2 w-2 rounded-full bg-current" aria-hidden />{st.label}</span>; } },
                ]} />
            </div>
          </Panel>
        </div>

        <div className="min-w-0 xl:col-span-5">
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

        <div className="min-w-0 xl:col-span-5">
          <Panel icon={CalendarDays} title="Upcoming milestones" iconTile>
            <ol className="relative px-6 pb-4">
              {milestones.map((m, i) => (
                <li key={m.id} className="relative">
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
          </Panel>
        </div>

        <div className="min-w-0 xl:col-span-7">
          <Panel icon={ListChecks} title="Priority decisions">
            <ol className="px-6 pb-4">
              {decisions.map((a, i) => (
                <li key={a.id}>
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
          </Panel>
        </div>
      </div>
    </div>
  );
}
