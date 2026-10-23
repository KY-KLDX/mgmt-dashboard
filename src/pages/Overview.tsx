import { ArrowRight, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { HBars, PnlTrend, SubscriptionTrend } from '../components/charts/Charts';
import { SeverityBadge, StatusBadge, severityStripe, toneFor } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { KpiCard, deltaAbs, deltaPct } from '../components/ui/KpiCard';
import { Button, Card, Progress } from '../components/ui/Primitives';
import { AS_OF, daysFromAsOf, monthKey } from '../data/asOf';
import { INVESTORS } from '../data/investors';
import { date, dateShort, int, pct, relDays, rm, rmShort } from '../lib/format';
import { upcomingItems } from '../lib/selectors/alerts';
import { activeTranchesAt, compareDate } from '../lib/selectors/common';
import { allTrancheStats, isActiveStage, isLiveStage, periodFinance, trendSeries } from '../lib/selectors/finance';
import { activeInvestors, bands, funnel, investorActivity, isCtosIncomplete, isKycIncomplete } from '../lib/selectors/investors';
import { monthsIn } from '../lib/period';
import type { LinkTarget } from '../lib/nav';
import { useApp } from '../state/AppState';

export function OverviewPage() {
  const { period, thresholds, alerts, navigate, openDrawer, bands: bandCfg, governance } = useApp();
  const [showAll, setShowAll] = useState(false);

  const fin = periodFinance(period, thresholds);
  const cmpFin = period.compare ? periodFinance(period.compare, thresholds) : null;
  const trend = useMemo(() => trendSeries(thresholds), [thresholds]);
  const budgetSubs = trend.filter((t) => monthsIn(period).includes(t.month)).reduce((a, t) => a + (t.budgetSubs ?? 0), 0);
  const budgetRev = trend.filter((t) => monthsIn(period).includes(t.month)).reduce((a, t) => a + (t.budgetRevenue ?? 0), 0);

  const at = period.end < AS_OF ? period.end : AS_OF;
  const cmp = compareDate(period);
  const act = activeInvestors(at);
  const actPrev = activeInvestors(cmp.at);
  const allocated = act.reduce((a, m) => a + m.current, 0);
  const allocatedPrev = actPrev.reduce((a, m) => a + m.current, 0);
  const stats = allTrancheStats(thresholds);
  const activeTr = stats.filter((s) => isActiveStage(s.tranche.stage));
  const closingSoon = stats.filter((s) => s.indicative && s.daysToClose >= 0 && s.daysToClose <= thresholds.trancheClosingSoonDays);
  const critical = alerts.filter((a) => a.severity === 'Critical');
  const high = alerts.filter((a) => a.severity === 'High');

  const spark = (k: 'subs' | 'revenue') => trend.slice(-7).map((t) => t[k]);
  const funnelAll = funnel(null);
  const activity = investorActivity(period);
  const ctos = INVESTORS.filter((i) => isCtosIncomplete(i)).length;
  const kyc = INVESTORS.filter((i) => isKycIncomplete(i)).length;
  const bandRows = bands(bandCfg);
  const upcoming = upcomingItems(governance).slice(0, 8);
  const shown = showAll ? alerts.filter((a) => a.severity !== 'Low' && a.severity !== 'Informational') : alerts.slice(0, 7);

  const snapshot = stats
    .filter((s) => s.tranche.stage !== 'Matured' && (s.tranche.stage !== 'Issued / Settled' || daysFromAsOf(s.tranche.closeDate) > -60))
    .sort((a, b) => b.tranche.closeDate.localeCompare(a.tranche.closeDate));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <KpiCard label={`Successful subscriptions · ${period.short}`} value={rmShort(fin.successful)}
          delta={cmpFin ? deltaPct(fin.successful, cmpFin.successful, `vs ${period.compare!.label}`) : deltaPct(fin.successful, budgetSubs, 'vs budget')}
          sub={`Budget ${rmShort(budgetSubs)} for ${monthsIn(period).length > 1 ? 'the period' : 'the month'} · ${fin.tranches.length} tranche${fin.tranches.length === 1 ? '' : 's'} closed`}
          spark={spark('subs')} onClick={() => navigate({ page: 'finance' })} />
        <KpiCard label={`Recognised revenue · ${period.short}`} value={rmShort(fin.revenue)}
          delta={cmpFin ? deltaPct(fin.revenue, cmpFin.revenue, `vs ${period.compare!.label}`) : deltaPct(fin.revenue, budgetRev, 'vs budget')}
          sub={`Budget ${rmShort(budgetRev)} · weighted fee ${pct(fin.feeRate, 2)} · tranche-derived`}
          spark={spark('revenue')} onClick={() => navigate({ page: 'finance' })} />
        <KpiCard label="Active tranches" value={int(activeTr.length)}
          delta={deltaAbs(activeTranchesAt(at), activeTranchesAt(cmp.at), cmp.label, true)}
          sub={`${activeTr.filter((s) => isLiveStage(s.tranche.stage)).length} live · ${closingSoon.length} closing within ${thresholds.trancheClosingSoonDays} days`}
          onClick={() => navigate({ page: 'finance', params: { view: 'current' } })} />
        <KpiCard label="Investors with current subscriptions" value={int(act.length)}
          delta={deltaAbs(act.length, actPrev.length, cmp.label, true)}
          sub={`${pct(funnelAll[0].count ? act.length / funnelAll[0].count : 0, 0)} of ${funnelAll[0].count} registered investors`}
          onClick={() => navigate({ page: 'investors' })} />
        <KpiCard label="Funds allocated into tranches" value={rmShort(allocated)}
          delta={deltaPct(allocated, allocatedPrev, cmp.label)}
          sub="Currently outstanding allocations across issued and closed tranches"
          onClick={() => navigate({ page: 'investors', params: { tab: 'current' } })} />
        <KpiCard label="Critical items requiring action" value={int(critical.length)} tone={critical.length ? 'crit' : undefined}
          delta={{ text: critical.length ? `${critical.length} above target of 0` : 'At target of 0', direction: critical.length ? 'up' : 'flat', good: critical.length ? false : null }}
          sub={`${high.length} high-severity items also open`}
          onClick={() => document.getElementById('attention')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Card id="attention" className="scroll-mt-40 xl:col-span-7" bodyClass="p-0"
          title="Management attention required"
          subtitle={`${critical.length} critical · ${high.length} high · sorted by severity, then deadline`}
          actions={<Button size="sm" variant="ghost" onClick={() => setShowAll((v) => !v)}>{showAll ? 'Show top items' : `Show all (${alerts.length})`}</Button>}>
          <ul className="divide-y divide-line">
            {shown.map((a) => {
              const d = a.date ? daysFromAsOf(a.date) : null;
              return (
                <li key={a.id} className="flex">
                  <span className={`w-1 shrink-0 ${severityStripe(a.severity)}`} aria-hidden />
                  <div className="flex min-w-0 flex-1 flex-wrap items-start gap-x-4 gap-y-2 px-5 py-3.5">
                    <div className="min-w-0 flex-1 basis-80">
                      <div className="flex flex-wrap items-center gap-2">
                        <SeverityBadge severity={a.severity} />
                        <span className="text-[11.5px] font-medium text-ink-3">{a.area}</span>
                      </div>
                      <p className="mt-1 text-[13.5px] font-semibold leading-snug">{a.title}</p>
                      <p className="mt-0.5 text-[12.5px] text-ink-2"><span className="text-ink-3">Next action:</span> {a.action}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5 text-right">
                      <span className={`num text-[12px] font-medium ${d !== null && d < 0 && a.dateKind === 'due' ? 'text-crit' : 'text-ink-2'}`}>
                        {a.date ? (a.dateKind === 'due' ? `${date(a.date)} · ${relDays(d!)}` : `Since ${date(a.date)} · ${-d!} days`) : 'No set date'}
                      </span>
                      <span className="text-[12px] text-ink-3">{a.owner}</span>
                      <Button size="sm" onClick={() => navigate(a.link)} icon={<ChevronRight size={13} aria-hidden />} ariaLabel={`Open record: ${a.title}`}>Open record</Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="xl:col-span-5" bodyClass="p-0" title="Upcoming obligations" subtitle="Next 45 days across issuers, Board, policies, applications and technology risk">
          <ul className="divide-y divide-line">
            {upcoming.map((u) => {
              const d = daysFromAsOf(u.date);
              return (
                <li key={u.id}>
                  <button onClick={() => navigate(u.link)} className="flex w-full items-center gap-4 px-5 py-3 text-left hover:bg-sunken/70">
                    <div className="w-12 shrink-0 text-center">
                      <div className="num font-display text-[18px] font-semibold leading-none">{dateShort(u.date).split(' ')[0]}</div>
                      <div className="text-[11px] uppercase tracking-wide text-ink-3">{dateShort(u.date).split(' ')[1]}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium">{u.title}</div>
                      <div className="text-[12px] text-ink-3">{u.kind} · {u.owner}</div>
                    </div>
                    <span className={`num shrink-0 text-[12px] ${d <= 7 ? 'font-semibold text-warn' : 'text-ink-3'}`}>{relDays(d)}</span>
                    <ArrowRight size={14} className="shrink-0 text-ink-3" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <Card title="Financial performance trend" subtitle="Last 13 months · October is month to date"
        actions={<Button size="sm" variant="ghost" onClick={() => navigate({ page: 'finance', params: { section: 'pnl' } })}>Monthly P&L <ArrowRight size={13} aria-hidden /></Button>}>
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
          <div>
            <h3 className="mb-2 text-[13px] font-semibold">Successful subscription amount <span className="font-normal text-ink-3">· tranche-derived</span></h3>
            <SubscriptionTrend data={trend} onMonth={(m) => navigate({ page: 'finance', params: { month: m } })} />
          </div>
          <div>
            <h3 className="mb-2 text-[13px] font-semibold">Revenue, operating expenses and EBITDA</h3>
            <PnlTrend data={trend} />
          </div>
        </div>
        <p className="mt-4 rounded-lg bg-sunken px-3 py-2 text-[12px] text-ink-2">
          Recognised revenue is tranche-derived (successful subscription × tranche fee rate). Operating expenses and EBITDA come from the company-level month-end P&L and are not allocated to tranches. October P&L closes after month end.
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-8" bodyClass="p-0" title="Tranche performance snapshot" subtitle="Live, recently closed and upcoming tranches"
          actions={<Button size="sm" variant="ghost" onClick={() => navigate({ page: 'finance' })}>All tranches <ArrowRight size={13} aria-hidden /></Button>}>
          <DataTable caption="Tranche performance snapshot" rows={snapshot} rowKey={(s) => s.tranche.id} onRowClick={(s) => openDrawer({ kind: 'tranche', id: s.tranche.id })}
            columns={[
              { key: 'n', header: 'Tranche', render: (s) => <span className="whitespace-nowrap font-medium">{s.tranche.name}</span>, sort: (s) => s.tranche.name },
              { key: 't', header: 'Target', align: 'right', render: (s) => rm(s.tranche.target), sort: (s) => s.tranche.target },
              { key: 'a', header: 'Subscribed', align: 'right', render: (s) => <span>{rm(s.indicative ? s.pending : s.successful)}{s.indicative && <span className="block text-[11px] text-ink-3">pending</span>}</span>, sort: (s) => (s.indicative ? s.pending : s.successful) },
              { key: 'f', header: 'Fulfilment', align: 'right', render: (s) => (
                <div className="ml-auto w-24"><div className="num mb-1 text-right">{pct(s.fulfilment, 0)}</div><Progress value={s.fulfilment} tone={s.risk === 'Critical' ? 'crit' : s.risk === 'Attention' ? 'warn' : 'accent'} /></div>
              ), sort: (s) => s.fulfilment },
              { key: 'c', header: 'Close date', render: (s) => <span className="num whitespace-nowrap">{date(s.tranche.closeDate)}</span>, sort: (s) => s.tranche.closeDate },
              { key: 's', header: 'Status', render: (s) => <StatusBadge status={s.tranche.stage} /> },
              { key: 'x', header: 'Exception', render: (s) => (s.risk === 'Critical' || s.risk === 'Attention' ? <StatusBadge status={s.risk} tone={toneFor(s.risk === 'Attention' ? 'attention' : 'critical')} /> : <span className="text-ink-3">—</span>) },
            ]} />
        </Card>

        <Card className="xl:col-span-4" title="Investor health" subtitle="As at reporting date"
          actions={<Button size="sm" variant="ghost" onClick={() => navigate({ page: 'investors' })}>Investors <ArrowRight size={13} aria-hidden /></Button>}>
          <dl className="grid grid-cols-2 gap-x-5 gap-y-4">
            {([
              { l: 'Registered → current subscription', v: pct(funnelAll[6].fromStart, 0), s: `${funnelAll[6].count} of ${funnelAll[0].count} investors`, link: { page: 'investors' as const } },
              { l: 'Investors with current subscriptions', v: int(act.length), s: `${rmShort(allocated)} outstanding`, link: { page: 'investors' as const, params: { tab: 'current' } } },
              { l: 'CTOS incomplete', v: int(ctos), s: 'Awaiting CTOS check', warn: ctos > 0, link: { page: 'investors' as const, params: { stage: 'ctos' } } },
              { l: 'KYC incomplete', v: int(kyc), s: 'CTOS done, awaiting KYC', warn: kyc > 0, link: { page: 'investors' as const, params: { stage: 'kyc' } } },
              { l: `Failed top-ups · ${period.short}`, v: int(activity.failed.length), s: rm(activity.failedAmount), warn: activity.failed.length > 0, link: { page: 'investors' as const, params: { stage: 'failed' } } },
              { l: 'Largest band share of value', v: pct(Math.max(...bandRows.map((b) => b.share)), 0), s: bandRows.find((b) => b.share === Math.max(...bandRows.map((x) => x.share)))!.label },
            ] as { l: string; v: string; s: string; warn?: boolean; link?: LinkTarget }[]).map((x) => (
              <div key={x.l} className="min-w-0">
                <dt className="text-[12px] leading-snug text-ink-3">{x.l}</dt>
                <dd>
                  {x.link ? (
                    <button onClick={() => navigate(x.link!)} className={`num font-display text-[20px] font-semibold hover:underline ${x.warn ? 'text-warn' : ''}`}>{x.v}</button>
                  ) : <span className="num font-display text-[20px] font-semibold">{x.v}</span>}
                  <span className="block truncate text-[11.5px] text-ink-3">{x.s}</span>
                </dd>
              </div>
            ))}
          </dl>
          <h3 className="mb-1 mt-5 text-[12.5px] font-semibold">Current subscription concentration by value band</h3>
          <HBars valueLabel="Share of current subscriptions" color="var(--series-1)"
            data={bandRows.map((b) => ({ key: String(b.key), label: b.short, value: b.share, display: `${pct(b.share, 0)} · ${b.count}`, sub: `${b.count} investors · ${rm(b.amount)}${b.concentrated ? ' · concentrated' : ''}` }))}
            onSelect={(k) => navigate({ page: 'investors', params: { band: k } })} />
          <p className="text-[11.5px] text-ink-3">Bar label: share of value · number of investors.</p>
        </Card>
      </div>
      <p className="text-[11.5px] text-ink-3">Period figures use tranches closed in {period.label}. Point-in-time figures are as at {date(at)}{monthKey(at) !== monthKey(AS_OF) ? ' (end of selected period)' : ''}.</p>
    </div>
  );
}
