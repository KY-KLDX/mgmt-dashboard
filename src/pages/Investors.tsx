import { AlertTriangle, ArrowRight, Banknote, ChevronRight, CreditCard, Layers, Target, UserRoundCog, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { HBars } from '../components/charts/Charts';
import { Funnel } from '../components/charts/Funnel';
import { StatusBadge } from '../components/ui/Badge';
import { ACTIVITY_TABS, ActivityRow } from '../components/ui/ActivityRow';
import { deltaAbs, deltaPct } from '../components/ui/KpiCard';
import { Button, EmptyState, Tabs } from '../components/ui/Primitives';
import { HeroKpi, Panel } from '../components/ui/Showcase';
import { AS_OF, TREND_MONTHS, monthEnd, monthKey } from '../data/asOf';
import { INVESTORS, TRANSACTIONS } from '../data/investors';
import { int, pct, rm, rmShort } from '../lib/format';
import { activityIn, investorExceptions, type ActivityTab, type InvestorException } from '../lib/selectors/activity';
import { compareDate } from '../lib/selectors/common';
import { FUNNEL_STAGES, activeInvestors, bands, funnel, investorActivity, isCtosIncomplete, isKycIncomplete } from '../lib/selectors/investors';
import { useApp } from '../state/AppState';

const SEV: Record<InvestorException['severity'], string> = {
  Critical: 'bg-crit-soft text-crit',
  High: 'bg-warn-soft text-warn',
  Medium: 'bg-info-soft text-info',
  Review: 'bg-violet-soft text-violet',
};

const incompleteAt = (at: string) => INVESTORS.filter((i) => isCtosIncomplete(i, at) || isKycIncomplete(i, at)).length;

export function InvestorsPage() {
  const { period, bands: bandCfg, openDrawer, thresholds } = useApp();
  const [cohort, setCohort] = useState<'period' | 'all'>('period');
  const [tab, setTab] = useState<ActivityTab>('all');

  const at = period.end < AS_OF ? period.end : AS_OF;
  const cmp = compareDate(period);
  const act = activeInvestors(at);
  const actPrev = activeInvestors(cmp.at);
  const allocated = act.reduce((a, m) => a + m.current, 0);
  const allocatedPrev = actPrev.reduce((a, m) => a + m.current, 0);
  const incomplete = incompleteAt(at);
  const activity = investorActivity(period);
  const prevActivity = period.compare ? investorActivity(period.compare) : null;

  // Eight month-end points for the mini bars.
  const months = TREND_MONTHS.slice(-8);
  const ends = months.map((m) => (monthEnd(m) < AS_OF ? monthEnd(m) : AS_OF));
  const bars = useMemo(() => ({
    active: ends.map((d) => activeInvestors(d).length),
    funds: ends.map((d) => activeInvestors(d).reduce((a, m) => a + m.current, 0)),
    incomplete: ends.map(incompleteAt),
    failed: months.map((m) => TRANSACTIONS.filter((t) => t.type === 'Top-up' && t.status === 'Failed' && monthKey(t.date) === m).length),
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const fun = useMemo(() => funnel(cohort === 'all' ? null : period), [cohort, period]);
  const bandRows = bands(bandCfg, at, cmp.at);
  const feed = activityIn(period, tab).slice(0, 5);
  const exceptions = investorExceptions(thresholds);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <HeroKpi icon={Users} tone="blue" label="Active investors" value={int(act.length)} bars={bars.active}
          delta={deltaAbs(act.length, actPrev.length, cmp.label, true)}
          info="Investors with at least one current subscription." onClick={() => openDrawer({ kind: 'investorList', id: 'group:active' })} />
        <HeroKpi icon={Banknote} tone="teal" label="Funds allocated" value={rmShort(allocated)} bars={bars.funds}
          delta={deltaPct(allocated, allocatedPrev, cmp.label)}
          info="Investor funds currently allocated into closed or issued tranches." />
        <HeroKpi icon={UserRoundCog} tone="violet" label="Onboarding incomplete" value={int(incomplete)} bars={bars.incomplete}
          delta={deltaAbs(incomplete, incompleteAt(cmp.at), cmp.label, false)}
          info="Investors waiting on CTOS or KYC." onClick={() => openDrawer({ kind: 'investorList', id: 'onboarding' })} />
        <HeroKpi icon={CreditCard} tone="red" label="Failed top-ups" value={int(activity.failed.length)} bars={bars.failed}
          delta={prevActivity ? deltaAbs(activity.failed.length, prevActivity.failed.length, period.compare!.short, false) : undefined}
          info={`${rm(activity.failedAmount)} failed in ${period.label}. Pending top-ups are excluded.`}
          onClick={() => openDrawer({ kind: 'investorList', id: 'exception:failed' })} />
      </div>

      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-12">
        <div className="min-w-0 2xl:col-span-7">
          <Panel icon={Target} title="Onboarding funnel" info="Status as at the reporting date. CTOS and KYC are separate stages. Click a bar to list investors who stopped there."
            actions={<Tabs label="Funnel cohort" value={cohort} onChange={setCohort} tabs={[{ key: 'period', label: 'Registered in period' }, { key: 'all', label: 'All investors' }]} />}>
            <div className="px-6 pb-5">
              {fun[0].count
                ? <Funnel stages={fun} selected={null} onSelect={(s) => s && openDrawer({ kind: 'investorList', id: `funnel:${FUNNEL_STAGES.indexOf(s as (typeof FUNNEL_STAGES)[number])}:${cohort}` })} />
                : <EmptyState title="No registrations in this period" body="Switch to All investors." />}
            </div>
          </Panel>
        </div>
        <div className="min-w-0 2xl:col-span-5">
          <Panel icon={Layers} title="Value bands" info={`Current subscriptions by investor value. Change ${cmp.label}. Concentrated: a band holds at least 50% of value with at most 25% of investors.`}>
            <div className="px-6 pb-5">
              <HBars valueLabel="Current subscribed amount" color="rgb(var(--accent))" onSelect={(k) => openDrawer({ kind: 'investorList', id: `band:${k}` })}
                data={bandRows.map((b) => ({ key: String(b.key), label: b.short, value: b.amount, display: rmShort(b.amount), sub: `${b.count} investors · ${pct(b.share)} of value` }))} />
              <table className="mt-2 w-full text-[12.5px]">
                <caption className="sr-only">Value band segmentation</caption>
                <thead><tr className="bg-sunken text-[11.5px] text-ink-2">
                  <th scope="col" className="rounded-l-md py-1.5 pl-2 text-left font-semibold">Band</th>
                  <th scope="col" className="py-1.5 text-right font-semibold">Investors</th>
                  <th scope="col" className="py-1.5 text-right font-semibold">Amount</th>
                  <th scope="col" className="py-1.5 text-right font-semibold">Share</th>
                  <th scope="col" className="py-1.5 text-right font-semibold">Change</th>
                  <th scope="col" className="rounded-r-md py-1.5 pl-3 text-left font-semibold">Concentration</th>
                </tr></thead>
                <tbody>
                  {bandRows.map((b) => (
                    <tr key={b.key} className="cursor-pointer border-b border-line/60 last:border-0 hover:bg-sunken/60" onClick={() => openDrawer({ kind: 'investorList', id: `band:${b.key}` })}>
                      <th scope="row" className="whitespace-nowrap py-1.5 pl-2 text-left font-semibold" title={b.label}>{b.short}</th>
                      <td className="num py-1.5 text-right">{b.count}</td>
                      <td className="num whitespace-nowrap py-1.5 text-right">{rm(b.amount)}</td>
                      <td className="num py-1.5 text-right">{pct(b.share)}</td>
                      <td className="num whitespace-nowrap py-1.5 text-right text-ink-2">{b.count - b.prevCount >= 0 ? '+' : '−'}{Math.abs(b.count - b.prevCount)} inv</td>
                      <td className="py-1.5 pl-3">{b.concentrated ? <StatusBadge status="Concentrated" tone="warn" /> : <StatusBadge status="Normal" tone="mute" />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <div className="min-w-0 2xl:col-span-7">
          <Panel icon={Users} iconTile="violet" title="Recent investor activity" info="Everything investors (or the back office) did in the selected period: onboarding steps, subscriptions, top-ups, manual deposits, withdrawals and profile changes."
            actions={<Tabs label="Activity type" value={tab} onChange={setTab} tabs={ACTIVITY_TABS} />}>
            <div className="flex flex-1 flex-col">
              <div className="mx-3 divide-y divide-line">
                {feed.length ? feed.map((e) => <ActivityRow key={e.id} e={e} onOpen={() => openDrawer({ kind: 'investor', id: e.investorId })} />)
                  : <EmptyState title="No activity of this type" body="Try another tab or period." />}
              </div>
              <div className="mt-auto px-6 pb-4 pt-2">
                <Button size="sm" variant="ghost" className="-ml-3 font-semibold text-accent" onClick={() => openDrawer({ kind: 'investorList', id: 'activity:all' })}>
                  View all activity <ArrowRight size={14} aria-hidden />
                </Button>
              </div>
            </div>
          </Panel>
        </div>
        <div className="min-w-0 2xl:col-span-5">
          <Panel icon={AlertTriangle} iconTile="red" title="Priority exceptions" info="Investor issues that need follow-up now, most urgent first."
            actions={<Button size="sm" variant="ghost" className="font-semibold text-accent" onClick={() => openDrawer({ kind: 'investorList', id: 'exception:all' })}>View all exceptions <ArrowRight size={14} aria-hidden /></Button>}>
            <ol className="px-4 pb-3">
              {exceptions.map((x, i) => (
                <li key={x.key}>
                  <button onClick={() => openDrawer({ kind: 'investorList', id: `exception:${x.key}` })} disabled={!x.count}
                    className={`flex w-full items-center gap-3 rounded-lg px-2 py-3.5 text-left hover:bg-sunken/70 disabled:opacity-50 ${i ? 'border-t border-line' : ''}`}>
                    <span className="num grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sunken text-[14px] font-semibold">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold">{x.title}</span>
                      <span className="block text-[12px] text-ink-3">{x.rule}</span>
                    </span>
                    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${SEV[x.severity]}`}>{x.severity}</span>
                    <span className="num w-16 shrink-0 text-right text-[13px] text-ink-2">{x.count} item{x.count === 1 ? '' : 's'}</span>
                    <ChevronRight size={15} className="shrink-0 text-ink-3" aria-hidden />
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
