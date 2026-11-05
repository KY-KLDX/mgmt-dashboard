import { Bell, BookOpen, CalendarDays, ChevronDown, Database, Download, RefreshCw, Search, Settings2 } from 'lucide-react';
import { AS_OF_LABEL } from '../../data/asOf';
import { date } from '../../lib/format';
import { PAGES } from '../../lib/nav';
import { PERIOD_OPTIONS, type PeriodKey } from '../../lib/period';
import { useApp } from '../../state/AppState';
import { Button } from '../ui/Primitives';

/**
 * Fine flowing lines that fade in from the right, after the KLDX website's line art.
 * Every curve starts and ends inside the viewBox, so nothing is clipped by the header edge.
 */
function HeaderArt() {
  const lines = Array.from({ length: 9 }, (_, i) => {
    const y = 104 - i * 6;
    return `M0 ${y + 10} C160 ${y + 8} 260 ${y - 40 + i * 2} 420 ${y - 46 + i * 3} S620 ${y - 70 + i * 4} 700 ${y - 92 + i * 5}`;
  });
  return (
    <svg className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-[56%] md:block" viewBox="0 0 700 120" preserveAspectRatio="none" aria-hidden
      style={{ maskImage: 'linear-gradient(to right, transparent, black 45%)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 45%)' }}>
      {lines.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={i % 3 === 0 ? 'rgb(var(--accent))' : 'rgb(var(--info))'} strokeWidth={1} opacity={0.16 + i * 0.02} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

export function TopBar() {
  const { page, period, periodKey, custom, dispatch, alerts, seen } = useApp();
  const title = PAGES.find((p) => p.key === page)!.title;
  const attention = alerts.filter((a) => a.severity === 'Critical' || a.severity === 'High').length;
  const fresh = alerts.filter((a) => (a.severity === 'Critical' || a.severity === 'High') && !seen.includes(a.id));
  const crit = fresh.filter((a) => a.severity === 'Critical').length;
  return (
    <header className="relative z-40 overflow-hidden lg:sticky lg:top-0 border-b border-line/70 bg-canvas/95 backdrop-blur">
      <HeaderArt />
      <div className="relative flex flex-wrap items-center gap-x-6 gap-y-3 px-6 pb-2 pt-4">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
          <h1 className="font-display text-[30px] font-semibold leading-tight tracking-tight sm:text-[34px]">{title}</h1>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-warn/40 bg-warn-soft px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-warn"
            title="Prototype using synthetic demonstration data. Not connected to KLDX production systems. All names are fictional.">
            <Database size={12} aria-hidden /> Synthetic data
            <span className="sr-only">: prototype using synthetic demonstration data, not connected to KLDX production systems.</span>
          </span>
        </div>
        <button onClick={() => dispatch({ type: 'modal', modal: 'search' })} aria-label="Search records (Ctrl K)"
          className="order-last flex h-11 w-full min-w-0 items-center gap-2.5 rounded-xl border border-line bg-canvas px-4 text-[14px] text-ink-3 transition-colors hover:border-accent/50 hover:bg-surface xl:order-none xl:mx-auto xl:w-auto xl:max-w-[440px] xl:flex-1">
          <Search size={17} aria-hidden />
          <span className="flex-1 truncate text-left">Search tranches, issuers, investors, policies…</span>
          <kbd className="hidden rounded-md border border-line bg-surface px-1.5 py-0.5 font-mono text-[11px] text-ink-3 sm:inline">Ctrl K</kbd>
        </button>
        <div className="ml-auto flex flex-wrap items-center gap-2 xl:ml-0">
          <button onClick={() => dispatch({ type: 'modal', modal: 'notifications' })} aria-label={`Notifications: ${attention} items need attention, ${fresh.length} new`}
            className="relative rounded-lg p-2 text-ink-2 hover:bg-sunken hover:text-ink">
            <Bell size={20} aria-hidden />
            {fresh.length > 0 && (
              <span className={`num absolute -right-0.5 -top-0.5 min-w-[19px] rounded-full px-1 text-center text-[10.5px] font-semibold leading-[19px] text-white ${crit ? 'bg-crit' : 'bg-warn'}`}>{fresh.length}</span>
            )}
          </button>
          <button onClick={() => dispatch({ type: 'modal', modal: 'dictionary' })} aria-label="Metric dictionary" title="Metric dictionary"
            className="rounded-lg p-2 text-ink-2 hover:bg-sunken hover:text-ink"><BookOpen size={20} aria-hidden /></button>
          <button onClick={() => dispatch({ type: 'modal', modal: 'settings' })} aria-label="Demo settings and thresholds" title="Demo settings"
            className="rounded-lg p-2 text-ink-2 hover:bg-sunken hover:text-ink"><Settings2 size={20} aria-hidden /></button>
          <Button variant="primary" onClick={() => dispatch({ type: 'modal', modal: 'export' })} icon={<Download size={16} aria-hidden />} className="h-10 px-4">Export</Button>
        </div>
      </div>
      <div className="relative flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="period" className="sr-only">Reporting period</label>
          <span className="relative inline-flex items-center">
            <CalendarDays size={17} className="pointer-events-none absolute left-3 text-ink-2" aria-hidden />
            <select id="period" value={periodKey} onChange={(e) => dispatch({ type: 'period', key: e.target.value as PeriodKey })}
              className="h-10 appearance-none rounded-lg border border-line bg-surface pl-10 pr-9 text-[14px] font-semibold text-ink shadow-card">
              {PERIOD_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-3 text-ink-2" aria-hidden />
          </span>
          {periodKey === 'CUSTOM' ? (
            <span className="flex items-center gap-1.5 text-[12px] text-ink-3">
              <label htmlFor="from" className="sr-only">From</label>
              <input id="from" type="date" min="2025-10-01" max={custom.end} value={custom.start}
                onChange={(e) => e.target.value && dispatch({ type: 'period', key: 'CUSTOM', custom: { ...custom, start: e.target.value } })}
                className="h-9 rounded-lg border border-line bg-surface px-2 text-[12.5px] text-ink" />
              to
              <label htmlFor="to" className="sr-only">To</label>
              <input id="to" type="date" min={custom.start} max="2026-10-23" value={custom.end}
                onChange={(e) => e.target.value && dispatch({ type: 'period', key: 'CUSTOM', custom: { ...custom, end: e.target.value } })}
                className="h-9 rounded-lg border border-line bg-surface px-2 text-[12.5px] text-ink" />
            </span>
          ) : (
            <span className="num text-[13.5px] text-ink-3 sm:border-l sm:border-line sm:pl-3">{date(period.start)} – {date(period.end)}</span>
          )}
        </div>
        <span className="flex items-center gap-1.5 text-[13.5px] text-ink-3">
          <RefreshCw size={14} aria-hidden /> <span className="sr-only">Last refreshed</span><span className="num" title="Last refreshed (synthetic reporting date)">{AS_OF_LABEL}</span>
        </span>
      </div>
    </header>
  );
}
