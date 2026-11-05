import { Building2, Check, ChevronDown, ChevronLeft, ChevronRight, Cpu, HelpCircle, Home, Landmark, ScrollText, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Role } from '../../data/types';
import { PAGES, type PageKey } from '../../lib/nav';
import type { Area } from '../../lib/selectors/alerts';
import { useApp } from '../../state/AppState';

const ICONS: Record<PageKey, typeof Home> = {
  overview: Home, finance: Landmark, investors: Users, issuers: Building2, technology: Cpu, governance: ScrollText,
};
const AREA: Partial<Record<PageKey, Area>> = {
  finance: 'Finance & Tranches', investors: 'Investors', issuers: 'Issuers', technology: 'Technology', governance: 'Governance',
};

export function Sidebar() {
  const { page, navigate, alerts, navCollapsed: c, dispatch } = useApp();
  return (
    <nav aria-label="Primary" className={`flex h-full shrink-0 flex-col bg-rail text-rail-ink transition-[width] duration-200 ${c ? 'w-[72px]' : 'w-[232px]'}`}>
      <div className={`flex items-start pb-7 pt-6 ${c ? 'flex-col items-center gap-3 px-2' : 'justify-between px-5'}`}>
        <div className={c ? 'text-center' : ''}>
          <div className={`font-display font-semibold leading-none tracking-tight ${c ? 'text-[17px]' : 'text-[24px]'}`}>KLDX</div>
          {!c && <div className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-rail-muted">Management</div>}
        </div>
        <button onClick={() => dispatch({ type: 'toggleNav' })} aria-label={c ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!c}
          className="rounded-md p-1 text-rail-muted hover:bg-rail-hover hover:text-white">
          {c ? <ChevronRight size={18} aria-hidden /> : <ChevronLeft size={18} aria-hidden />}
        </button>
      </div>
      <ul className="flex flex-col gap-1">
        {PAGES.map((p) => {
          const Icon = ICONS[p.key];
          const area = AREA[p.key];
          const crit = area ? alerts.filter((a) => a.area === area && a.severity === 'Critical').length : 0;
          const high = area ? alerts.filter((a) => a.area === area && a.severity === 'High').length : 0;
          const n = crit || high;
          const active = page === p.key;
          return (
            <li key={p.key} className="relative">
              {active && <span className="absolute inset-y-1 left-0 w-1 rounded-r bg-rail-accent" aria-hidden />}
              <button onClick={() => navigate({ page: p.key })} aria-current={active ? 'page' : undefined} aria-label={c ? p.label : undefined} title={c ? p.label : undefined}
                className={`mx-3 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-lg py-2.5 text-left text-[13.5px] transition-colors ${c ? 'justify-center px-0' : 'px-3'} ${active ? 'bg-rail-hover font-semibold text-white' : 'text-rail-ink/85 hover:bg-rail-hover hover:text-white'}`}>
                <span className="relative">
                  <Icon size={18} strokeWidth={active ? 2.25 : 1.75} className={active ? 'text-rail-accent' : 'text-rail-muted'} aria-hidden />
                  {c && n > 0 && <span className={`absolute -right-1.5 -top-1 h-2 w-2 rounded-full ${crit ? 'bg-crit' : 'bg-warn'}`} aria-hidden />}
                </span>
                {!c && <span className="flex-1 leading-tight">{p.label}</span>}
                {!c && n > 0 && (
                  <span className={`num grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10.5px] font-semibold text-white ${crit ? 'bg-crit' : 'bg-warn'}`} title={`${n} ${crit ? 'critical' : 'high'} alerts`}>
                    {n}<span className="sr-only"> {crit ? 'critical' : 'high'}</span>
                  </span>
                )}
                {c && n > 0 && <span className="sr-only">{n} {crit ? 'critical' : 'high'} alerts</span>}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto px-3 pb-4">
        <div className="mx-2 mb-3 border-t border-white/10" />
        <button onClick={() => dispatch({ type: 'modal', modal: 'dictionary' })} title={c ? 'Help & Support' : undefined} aria-label="Help & Support"
          className={`flex w-full items-center gap-3 rounded-lg py-2.5 text-[13.5px] text-rail-ink/85 hover:bg-rail-hover hover:text-white ${c ? 'justify-center' : 'px-3'}`}>
          <HelpCircle size={18} className="text-rail-muted" aria-hidden />
          {!c && 'Help & Support'}
        </button>
        <ProfileMenu collapsed={c} />
      </div>
    </nav>
  );
}

function ProfileMenu({ collapsed }: { collapsed: boolean }) {
  const { role, dispatch, toast } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  const setRole = (r: Role) => {
    if (r !== role) {
      dispatch({ type: 'role', role: r });
      toast(r === 'CEO' ? 'CEO view: names visible' : 'Management view: names hidden', 'info');
    }
    setOpen(false);
  };
  return (
    <div ref={ref} className="relative mt-1">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="true" aria-label={`Profile and demo role: ${role === 'CEO' ? 'CEO view' : 'Management view'}`}
        className={`flex w-full items-center gap-3 rounded-lg py-2 text-left hover:bg-rail-hover ${collapsed ? 'justify-center' : 'px-2'}`}>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-info text-[12px] font-semibold text-white">KM</span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-medium">KLDX Management</span>
              <span className="block truncate text-[11.5px] text-rail-muted">{role === 'CEO' ? 'CEO view' : 'Management view'}</span>
            </span>
            <ChevronDown size={16} className={`text-rail-muted transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
          </>
        )}
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-60 rounded-xl border border-line bg-surface p-2 text-ink shadow-lift animate-rise">
          <div className="px-2 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wider text-ink-3">Demo role simulation</div>
          <div role="radiogroup" aria-label="Demo role simulation">
            {(['CEO', 'Management'] as Role[]).map((r) => (
              <button key={r} role="radio" aria-checked={role === r} aria-label={r === 'CEO' ? 'CEO View' : 'Management View'} onClick={() => setRole(r)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[13px] hover:bg-sunken">
                <span className="flex-1">
                  <span className="block font-medium">{r === 'CEO' ? 'CEO view' : 'Management view'}</span>
                  <span className="block text-[11.5px] text-ink-3">{r === 'CEO' ? 'Investor names visible' : 'Investor names hidden'}</span>
                </span>
                {role === r && <Check size={15} className="text-accent" aria-hidden />}
              </button>
            ))}
          </div>
          <p className="border-t border-line px-2 pt-2 text-[11.5px] leading-snug text-ink-3">Simulation only. Real access control must be enforced on the server.</p>
        </div>
      )}
    </div>
  );
}
