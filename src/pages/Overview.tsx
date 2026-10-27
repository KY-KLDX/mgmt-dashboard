import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { SeverityBadge, severityStripe } from '../components/ui/Badge';
import { KpiCard, deltaAbs, deltaPct, deltaTarget } from '../components/ui/KpiCard';
import { Button, Card, Tabs } from '../components/ui/Primitives';
import { AS_OF, daysFromAsOf } from '../data/asOf';
import { dateShort, int, relDays, rmShort } from '../lib/format';
import { monthsIn } from '../lib/period';
import { upcomingItems, type Alert } from '../lib/selectors/alerts';
import { compareDate } from '../lib/selectors/common';
import { periodFinance, trendSeries } from '../lib/selectors/finance';
import { activeInvestors } from '../lib/selectors/investors';
import { useApp } from '../state/AppState';

const TOP = 5;

/** Alert titles without the trailing status words, which the date column already shows. */
export function shortTitle(a: Alert): string {
  return a.title
    .replace(/ — (overdue|blocked|awaiting CEO decision|preparation deadline missed|\d+% ready for Board)$/, '')
    .replace(/^(Critical|High) cyber risk with overdue treatment: /, 'Cyber risk: ');
}

function dueText(a: Alert): { text: string; late: boolean } {
  if (!a.date) return { text: 'Open', late: false };
  const d = daysFromAsOf(a.date);
  if (a.dateKind === 'since') return { text: `${-d}d open`, late: false };
  return { text: relDays(d), late: d < 0 };
}

export function OverviewPage() {
  const { period, thresholds, alerts, navigate, dispatch, governance } = useApp();
  const [view, setView] = useState<'decide' | 'upcoming'>('decide');

  const fin = periodFinance(period, thresholds);
  const cmpFin = period.compare ? periodFinance(period.compare, thresholds) : null;
  const budget = trendSeries(thresholds).filter((t) => monthsIn(period).includes(t.month));
  const budgetSubs = budget.reduce((a, t) => a + (t.budgetSubs ?? 0), 0);
  const budgetRev = budget.reduce((a, t) => a + (t.budgetRevenue ?? 0), 0);
  const cl = period.compare?.short ?? 'vs budget';

  const at = period.end < AS_OF ? period.end : AS_OF;
  const cmp = compareDate(period);
  const act = activeInvestors(at);
  const critical = alerts.filter((a) => a.severity === 'Critical');
  const high = alerts.filter((a) => a.severity === 'High');
  const upcoming = upcomingItems(governance).slice(0, TOP);

  return (
    <div className="mx-auto max-w-[1180px] space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Subscriptions" value={rmShort(fin.successful)}
          delta={cmpFin ? deltaPct(fin.successful, cmpFin.successful, cl) : deltaPct(fin.successful, budgetSubs, 'vs budget')}
          sub={`Successful subscriptions, ${period.label}. Budget ${rmShort(budgetSubs)}. ${fin.tranches.length} tranche(s) closed.`}
          onClick={() => navigate({ page: 'finance' })} />
        <KpiCard label="Revenue" value={rmShort(fin.revenue)}
          delta={cmpFin ? deltaPct(fin.revenue, cmpFin.revenue, cl) : deltaPct(fin.revenue, budgetRev, 'vs budget')}
          sub={`Recognised revenue (successful subscription × tranche fee rate), ${period.label}. Budget ${rmShort(budgetRev)}.`}
          onClick={() => navigate({ page: 'finance' })} />
        <KpiCard label="Active investors" value={int(act.length)}
          delta={deltaAbs(act.length, activeInvestors(cmp.at).length, cmp.label, true)}
          sub={`Investors with at least one current subscription, holding ${rmShort(act.reduce((a, m) => a + m.current, 0))}.`}
          onClick={() => navigate({ page: 'investors' })} />
        <KpiCard label="Critical items" value={int(critical.length)} tone={critical.length ? 'crit' : undefined}
          delta={deltaTarget(critical.length)}
          sub={`Unresolved items meeting the demo critical threshold. ${high.length} high-severity items are also open.`}
          onClick={() => dispatch({ type: 'modal', modal: 'notifications' })} />
      </div>

      <Card bodyClass="p-0"
        title={view === 'decide' ? 'Needs a decision' : 'Coming up'}
        actions={<Tabs label="Overview list" value={view} onChange={setView}
          tabs={[{ key: 'decide', label: 'Decisions', count: critical.length + high.length }, { key: 'upcoming', label: 'Upcoming' }]} />}>
        {view === 'decide' ? (
          <ul className="divide-y divide-line">
            {alerts.slice(0, TOP).map((a) => {
              const due = dueText(a);
              return (
                <li key={a.id} className="flex">
                  <span className={`w-1 shrink-0 ${severityStripe(a.severity)}`} aria-hidden />
                  <button onClick={() => navigate(a.link)} aria-label={`Open record: ${a.title}`}
                    className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 text-left hover:bg-sunken/60">
                    <SeverityBadge severity={a.severity} />
                    <span className="min-w-0 flex-1 basis-64">
                      <span className="block truncate text-[14.5px] font-semibold">{shortTitle(a)}</span>
                      <span className="block truncate text-[12.5px] text-ink-3">{a.owner}</span>
                    </span>
                    <span className={`num shrink-0 text-[13px] font-medium ${due.late ? 'text-crit' : 'text-ink-2'}`}>{due.text}</span>
                    <ChevronRight size={16} className="shrink-0 text-ink-3" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <ul className="divide-y divide-line">
            {upcoming.map((u) => {
              const d = daysFromAsOf(u.date);
              return (
                <li key={u.id}>
                  <button onClick={() => navigate(u.link)} className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-sunken/60">
                    <span className="num w-14 shrink-0 text-[13px] font-semibold">{dateShort(u.date)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-semibold">{u.title}</span>
                      <span className="block truncate text-[12.5px] text-ink-3">{u.kind}</span>
                    </span>
                    <span className={`num shrink-0 text-[13px] ${d <= 7 ? 'font-semibold text-warn' : 'text-ink-3'}`}>{relDays(d)}</span>
                    <ChevronRight size={16} className="shrink-0 text-ink-3" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="border-t border-line px-5 py-2.5 text-right">
          <Button size="sm" variant="ghost" onClick={() => (view === 'decide' ? dispatch({ type: 'modal', modal: 'notifications' }) : navigate({ page: 'issuers' }))}>
            {view === 'decide' ? `See all ${critical.length + high.length}` : 'See all obligations'} <ChevronRight size={13} aria-hidden />
          </Button>
        </div>
      </Card>
    </div>
  );
}
