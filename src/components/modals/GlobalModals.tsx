import { ArrowRight, FileSpreadsheet, FileText, Lock, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DICTIONARY } from '../../data/dictionary';
import { DEFAULT_BANDS, DEFAULT_THRESHOLDS, type Bands, type Thresholds } from '../../data/thresholds';
import { date, rm } from '../../lib/format';
import { investorLabel } from '../../lib/identity';
import { PAGES, type PageKey } from '../../lib/nav';
import { search, type SearchResult } from '../../lib/selectors/search';
import { activeInvestors, bandLabels } from '../../lib/selectors/investors';
import { useApp } from '../../state/AppState';
import { SeverityBadge, severityStripe } from '../ui/Badge';
import { Button, EmptyState, Modal } from '../ui/Primitives';

export function GlobalModals() {
  const { modal, dispatch } = useApp();
  const close = () => dispatch({ type: 'modal', modal: null });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        dispatch({ type: 'modal', modal: 'search' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch]);

  return (
    <>
      <SearchPalette open={modal === 'search'} onClose={close} />
      <ExportModal open={modal === 'export'} onClose={close} />
      <DictionaryModal open={modal === 'dictionary'} onClose={close} />
      <SettingsModal open={modal === 'settings'} onClose={close} />
      <NotificationsModal open={modal === 'notifications'} onClose={close} />
    </>
  );
}

function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { role, governance, navigate } = useApp();
  const [q, setQ] = useState('');
  useEffect(() => { if (!open) setQ(''); }, [open]);
  const results = useMemo(() => search(q, role, governance), [q, role, governance]);
  const groups = useMemo(() => {
    const m = new Map<string, SearchResult[]>();
    results.forEach((r) => m.set(r.group, [...(m.get(r.group) ?? []), r]));
    return [...m.entries()];
  }, [results]);
  return (
    <Modal open={open} onClose={onClose} title="Search records" width="max-w-2xl">
      <label htmlFor="global-search" className="sr-only">Search tranches, issuers, investors, incidents, policies and governance items</label>
      <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 focus-within:border-accent">
        <Search size={16} className="text-ink-3" aria-hidden />
        <input id="global-search" data-autofocus autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder={role === 'CEO' ? 'Tranche, issuer, investor name or ID, incident, policy…' : 'Tranche, issuer, investor ID (e.g. INV-1047), incident, policy…'}
          className="h-10 flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink-3" />
      </div>
      {role === 'Management' && <p className="mt-2 flex items-center gap-1.5 text-[12px] text-ink-3"><Lock size={12} aria-hidden /> Management View: investors are searchable by anonymised ID only.</p>}
      <div className="mt-3">
        {q.trim().length < 2 ? (
          <p className="py-6 text-center text-[13px] text-ink-3">Type at least two characters. Try “Arus”, “payment”, “AML” or “INV-1007”.</p>
        ) : !results.length ? (
          <EmptyState title={`No synthetic records match “${q}”`} body="Search covers tranches, issuers, investors, incidents, cyber risks, obligations and governance items." />
        ) : (
          <div className="space-y-4">
            {groups.map(([g, rs]) => (
              <div key={g}>
                <div className="eyebrow mb-1.5">{g}</div>
                <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
                  {rs.map((r) => (
                    <li key={`${r.group}-${r.key}`}>
                      <button onClick={() => navigate(r.link)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent-soft/50">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-medium">{r.title}</span>
                          <span className="block truncate text-[12px] text-ink-3">{r.sub}</span>
                        </span>
                        <ArrowRight size={14} className="text-ink-3" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

function ExportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { page, role, period, toast } = useApp();
  const [scope, setScope] = useState<PageKey | 'all'>(page);
  const [format, setFormat] = useState<'PDF' | 'XLSX'>('PDF');
  const [level, setLevel] = useState<'aggregate' | 'record'>('aggregate');
  useEffect(() => { if (open) setScope(page); }, [open, page]);
  const preview = activeInvestors().sort((a, b) => b.current - a.current).slice(0, 3);
  const confirm = () => {
    onClose();
    toast(`Demo export prepared: ${scope === 'all' ? 'all pages' : PAGES.find((p) => p.key === scope)?.label} (${format}, ${role === 'CEO' ? 'CEO View' : 'anonymised'}). No file was generated.`);
  };
  return (
    <Modal open={open} onClose={onClose} title="Export management pack" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={confirm}>Prepare demo export</Button></>}>
      <div className="space-y-4">
        <p className="rounded-lg bg-warn-soft px-3 py-2 text-[12.5px] text-ink-2">Demo only. The prototype does not create files containing investor data. A production export would be generated server-side under access control and logged.</p>
        <fieldset>
          <legend className="mb-1.5 text-[12px] font-medium text-ink-3">Content</legend>
          <select aria-label="Export scope" value={scope} onChange={(e) => setScope(e.target.value as PageKey | 'all')} className="h-9 w-full rounded-lg border border-line bg-surface px-2 text-[13px]">
            {PAGES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            <option value="all">All pages (board pack)</option>
          </select>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          {(['PDF', 'XLSX'] as const).map((f) => (
            <button key={f} onClick={() => setFormat(f)} aria-pressed={format === f}
              className={`flex items-center gap-2 rounded-lg border p-3 text-left text-[13px] ${format === f ? 'border-accent bg-accent-soft/60' : 'border-line hover:bg-sunken'}`}>
              {f === 'PDF' ? <FileText size={18} aria-hidden /> : <FileSpreadsheet size={18} aria-hidden />}
              <span><span className="block font-medium">{f === 'PDF' ? 'PDF summary' : 'Excel tables'}</span><span className="text-[12px] text-ink-3">{f === 'PDF' ? 'Charts and KPI cards' : 'Exact values, one sheet per table'}</span></span>
            </button>
          ))}
        </div>
        <fieldset className="space-y-1.5">
          <legend className="mb-1 text-[12px] font-medium text-ink-3">Investor detail</legend>
          {(['aggregate', 'record'] as const).map((l) => (
            <label key={l} className="flex items-center gap-2 text-[13px]">
              <input type="radio" name="export-level" checked={level === l} onChange={() => setLevel(l)} />
              {l === 'aggregate' ? 'Aggregates only (bands, counts, totals)' : `Record level (${role === 'CEO' ? 'names, CEO View' : 'anonymised IDs'})`}
            </label>
          ))}
        </fieldset>
        <div>
          <div className="eyebrow mb-1.5">Preview · {period.label}</div>
          <div className="overflow-hidden rounded-lg border border-line text-[12.5px]">
            {level === 'aggregate' ? (
              <div className="p-3 text-ink-2">{activeInvestors().length} investors with current subscriptions · {rm(activeInvestors().reduce((a, m) => a + m.current, 0))} current subscriptions · 4 value bands</div>
            ) : (
              <table className="w-full">
                <tbody>
                  {preview.map((m) => (
                    <tr key={m.inv.id} className="border-b border-line last:border-0">
                      <td className="px-3 py-1.5">{investorLabel(m.inv, role)}</td>
                      <td className="num px-3 py-1.5 text-right">{rm(m.current)}</td>
                    </tr>
                  ))}
                  <tr><td colSpan={2} className="px-3 py-1.5 text-ink-3">…</td></tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function DictionaryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const rows = DICTIONARY.filter((d) => !q || `${d.term} ${d.definition} ${d.category}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Modal open={open} onClose={onClose} title="Management metric dictionary" width="max-w-3xl">
      <p className="mb-3 text-[12.5px] text-ink-3">Definitions used in this prototype. Source systems and business owners are placeholders to be confirmed by KLDX.</p>
      <label htmlFor="dict-q" className="sr-only">Filter metrics</label>
      <input id="dict-q" data-autofocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter metrics…" className="mb-3 h-9 w-full rounded-lg border border-line bg-surface px-3 text-[13px]" />
      <div className="space-y-3">
        {rows.map((d) => (
          <article key={d.term} className="rounded-lg border border-line p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-[14px] font-semibold">{d.term}</h3>
              <span className="text-[11.5px] text-ink-3">{d.category}</span>
            </div>
            <p className="mt-1 text-[13px] text-ink-2">{d.definition}</p>
            <dl className="mt-2.5 grid grid-cols-1 gap-x-6 gap-y-1.5 text-[12.5px] sm:grid-cols-[130px_1fr]">
              <dt className="text-ink-3">Calculation</dt><dd>{d.calculation}</dd>
              <dt className="text-ink-3">Example source</dt><dd>{d.source}</dd>
              <dt className="text-ink-3">Refresh</dt><dd>{d.refresh}</dd>
              <dt className="text-ink-3">Business owner</dt><dd>{d.owner}</dd>
              {d.caveat && <><dt className="text-ink-3">Caveat</dt><dd className="text-warn">{d.caveat}</dd></>}
            </dl>
          </article>
        ))}
        {!rows.length && <EmptyState title="No metric matches that filter" />}
      </div>
    </Modal>
  );
}

const TH_FIELDS: { key: keyof Thresholds; label: string; unit: string }[] = [
  { key: 'trancheClosingSoonDays', label: 'Tranche "closing soon" window', unit: 'days' },
  { key: 'trancheUnderTargetPct', label: 'Tranche under-target alert below', unit: '% of target' },
  { key: 'trancheCriticalPct', label: 'Tranche critical alert below', unit: '% of target' },
  { key: 'dueSoonDays', label: 'Obligation "due soon" window', unit: 'days' },
  { key: 'decisionWindowDays', label: 'CEO decision alert window', unit: 'days' },
  { key: 'onboardingStaleDays', label: 'Onboarding case is stale after', unit: 'days' },
  { key: 'onboardingBacklogCount', label: 'Onboarding backlog alert at', unit: 'cases' },
  { key: 'highValueTopUp', label: 'High-value failed top-up from', unit: 'RM' },
];

function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { thresholds, bands, dispatch, toast, demoError } = useApp();
  const [th, setTh] = useState<Thresholds>(thresholds);
  const [b, setB] = useState<Bands>(bands);
  useEffect(() => { if (open) { setTh(thresholds); setB(bands); } }, [open, thresholds, bands]);
  const bandsValid = b[0] > b[1] && b[1] > b[2] && b[2] > 0;
  const save = () => {
    dispatch({ type: 'thresholds', value: th });
    dispatch({ type: 'bands', value: b });
    onClose();
    toast('Demo thresholds and investor bands updated. Alerts and segments recalculated.');
  };
  return (
    <Modal open={open} onClose={onClose} title="Demo settings" width="max-w-2xl"
      footer={<>
        <Button variant="ghost" onClick={() => { setTh(DEFAULT_THRESHOLDS); setB(DEFAULT_BANDS); }}>Reset to defaults</Button>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={save} disabled={!bandsValid}>Apply</Button>
      </>}>
      <p className="mb-4 rounded-lg bg-info-soft px-3 py-2 text-[12.5px] text-ink-2">These are illustrative prototype thresholds, not KLDX policy. Production alert thresholds and investor bands would need to be formally agreed by KLDX.</p>
      <h3 className="eyebrow mb-2">Alert thresholds</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {TH_FIELDS.map((f) => (
          <label key={f.key} htmlFor={`th-${f.key}`} className="flex flex-col gap-1 text-[12.5px]">
            <span className="text-ink-2">{f.label} <span className="text-ink-3">({f.unit})</span></span>
            <input id={`th-${f.key}`} type="number" min={0} value={th[f.key]} onChange={(e) => setTh({ ...th, [f.key]: Number(e.target.value) })}
              className="num h-9 rounded-lg border border-line bg-surface px-2.5" />
          </label>
        ))}
      </div>
      <h3 className="eyebrow mb-2 mt-5">Investor value bands (current subscriptions)</h3>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((k) => (
          <label key={k} htmlFor={`band-${k}`} className="flex flex-col gap-1 text-[12.5px]">
            <span className="text-ink-2">Band {k + 1} lower bound (RM)</span>
            <input id={`band-${k}`} type="number" min={1000} step={50000} value={b[k]}
              onChange={(e) => { const n = [...b] as Bands; n[k] = Number(e.target.value); setB(n); }}
              className="num h-9 rounded-lg border border-line bg-surface px-2.5" />
          </label>
        ))}
      </div>
      {bandsValid ? (
        <p className="mt-2 text-[12px] text-ink-3">{bandLabels(b).join(' · ')}</p>
      ) : (
        <p className="mt-2 text-[12px] text-crit" role="alert">Band bounds must decrease from band 1 to band 3 and stay above zero.</p>
      )}
      <h3 className="eyebrow mb-2 mt-5">Prototype states</h3>
      <label className="flex items-center gap-2 text-[13px]">
        <input type="checkbox" checked={demoError} onChange={(e) => dispatch({ type: 'demoError', value: e.target.checked })} />
        Simulate an unavailable data feed (shows the error state on the Technology page)
      </label>
    </Modal>
  );
}

function NotificationsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { alerts, navigate } = useApp();
  const top = alerts.filter((a) => a.severity === 'Critical' || a.severity === 'High');
  return (
    <Modal open={open} onClose={onClose} title={`Needs attention (${top.length})`} width="max-w-xl">
      <ul className="space-y-2">
        {top.map((a) => (
          <li key={a.id}>
            <button onClick={() => navigate(a.link)} className="flex w-full overflow-hidden rounded-lg border border-line text-left hover:bg-sunken">
              <span className={`w-1 shrink-0 ${severityStripe(a.severity)}`} aria-hidden />
              <span className="flex-1 px-3 py-2.5">
                <span className="flex items-center gap-2"><SeverityBadge severity={a.severity} /><span className="text-[11.5px] text-ink-3">{a.area}</span></span>
                <span className="mt-1 block text-[13px] font-medium">{a.title}</span>
                <span className="block text-[12px] text-ink-3">{a.owner}{a.date ? ` · ${a.dateKind === 'due' ? 'due' : 'since'} ${date(a.date)}` : ''}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
