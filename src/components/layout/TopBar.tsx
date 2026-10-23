import { Bell, BookOpen, Database, Download, RefreshCw, Search, Settings2 } from 'lucide-react';
import { AS_OF_LABEL } from '../../data/asOf';
import type { Role } from '../../data/types';
import { PAGES } from '../../lib/nav';
import { PERIOD_OPTIONS, type PeriodKey } from '../../lib/period';
import { useApp } from '../../state/AppState';
import { Button, InfoTip } from '../ui/Primitives';

export function TopBar() {
  const { page, period, periodKey, custom, role, dispatch, alerts, toast } = useApp();
  const title = PAGES.find((p) => p.key === page)!.title;
  const attention = alerts.filter((a) => a.severity === 'Critical' || a.severity === 'High').length;
  const crit = alerts.filter((a) => a.severity === 'Critical').length;
  const setRole = (r: Role) => {
    if (r === role) return;
    dispatch({ type: 'role', role: r });
    toast(r === 'CEO' ? 'Switched to CEO View: synthetic investor names visible.' : 'Switched to Management View: investor identities anonymised.', 'info');
  };
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 pb-2 pt-3.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="font-display text-[23px] font-semibold leading-tight tracking-tight">{title}</h1>
          <span className="inline-flex items-center gap-1 rounded-full border border-warn/40 bg-warn-soft px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-warn">
            <Database size={11} aria-hidden /> Synthetic data
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="secondary" onClick={() => dispatch({ type: 'modal', modal: 'search' })} icon={<Search size={15} aria-hidden />} className="w-52 justify-start text-ink-3">
            <span className="flex-1 text-left">Search records</span>
            <kbd className="rounded border border-line px-1 font-mono text-[10px] text-ink-3">Ctrl K</kbd>
          </Button>
          <button onClick={() => dispatch({ type: 'modal', modal: 'notifications' })} aria-label={`Notifications: ${attention} items need attention`}
            className="relative rounded-lg p-2 text-ink-2 hover:bg-sunken hover:text-ink">
            <Bell size={18} aria-hidden />
            {attention > 0 && (
              <span className={`num absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full px-1 text-center text-[10px] font-semibold leading-[18px] text-white ${crit ? 'bg-crit' : 'bg-warn'}`}>{attention}</span>
            )}
          </button>
          <button onClick={() => dispatch({ type: 'modal', modal: 'dictionary' })} aria-label="Metric dictionary" title="Metric dictionary"
            className="rounded-lg p-2 text-ink-2 hover:bg-sunken hover:text-ink"><BookOpen size={18} aria-hidden /></button>
          <button onClick={() => dispatch({ type: 'modal', modal: 'settings' })} aria-label="Demo settings and thresholds" title="Demo settings"
            className="rounded-lg p-2 text-ink-2 hover:bg-sunken hover:text-ink"><Settings2 size={18} aria-hidden /></button>
          <Button variant="primary" onClick={() => dispatch({ type: 'modal', modal: 'export' })} icon={<Download size={15} aria-hidden />}>Export</Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="period" className="text-[12px] font-medium text-ink-3">Reporting period</label>
          <select id="period" value={periodKey} onChange={(e) => dispatch({ type: 'period', key: e.target.value as PeriodKey })}
            className="h-8 rounded-lg border border-line bg-surface px-2 text-[12.5px] font-medium text-ink">
            {PERIOD_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
          {periodKey === 'CUSTOM' && (
            <span className="flex items-center gap-1.5 text-[12px] text-ink-3">
              <label htmlFor="from" className="sr-only">From</label>
              <input id="from" type="date" min="2025-10-01" max={custom.end} value={custom.start}
                onChange={(e) => e.target.value && dispatch({ type: 'period', key: 'CUSTOM', custom: { ...custom, start: e.target.value } })}
                className="h-8 rounded-lg border border-line bg-surface px-2 text-[12.5px] text-ink" />
              to
              <label htmlFor="to" className="sr-only">To</label>
              <input id="to" type="date" min={custom.start} max="2026-10-23" value={custom.end}
                onChange={(e) => e.target.value && dispatch({ type: 'period', key: 'CUSTOM', custom: { ...custom, end: e.target.value } })}
                className="h-8 rounded-lg border border-line bg-surface px-2 text-[12.5px] text-ink" />
            </span>
          )}
          <span className="num text-[12px] text-ink-3">{period.label}{period.compare ? ` · compared with ${period.compare.label}` : ' · compared with budget'}</span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5 text-[12px] text-ink-3">
            <RefreshCw size={12} aria-hidden /> Last refreshed <span className="num font-medium text-ink-2">{AS_OF_LABEL}</span>
          </span>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[11.5px] font-medium text-ink-3">
              Demo role simulation
              <InfoTip label="About the role switcher" wide
                text="This switcher only simulates what each role would see. A real system would enforce access with server-side role-based access control. Hiding data in the browser does not protect it." />
            </span>
            <div role="radiogroup" aria-label="Demo role simulation" className="flex rounded-lg bg-sunken p-0.5">
              {(['CEO', 'Management'] as Role[]).map((r) => (
                <button key={r} role="radio" aria-checked={role === r} onClick={() => setRole(r)}
                  className={`rounded-md px-3 py-1 text-[12.5px] font-medium transition-colors ${role === r ? 'bg-rail text-white shadow-card' : 'text-ink-2 hover:text-ink'}`}>
                  {r === 'CEO' ? 'CEO View' : 'Management View'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
