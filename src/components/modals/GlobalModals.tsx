import { FileSpreadsheet, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DICTIONARY } from '../../data/dictionary';
import { rm } from '../../lib/format';
import { investorLabel } from '../../lib/identity';
import { PAGES, type PageKey } from '../../lib/nav';
import { activeInvestors } from '../../lib/selectors/investors';
import { useApp } from '../../state/AppState';
import { NotificationsPanel } from './NotificationsPanel';
import { Button, EmptyState, Modal } from '../ui/Primitives';

export function GlobalModals() {
  const { modal, dispatch } = useApp();
  const close = () => dispatch({ type: 'modal', modal: null });

  return (
    <>
      <ExportModal open={modal === 'export'} onClose={close} />
      <DictionaryModal open={modal === 'dictionary'} onClose={close} />
      {modal === 'notifications' && <NotificationsPanel onClose={close} />}
    </>
  );
}

function ExportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { page, period, toast } = useApp();
  const [scope, setScope] = useState<PageKey | 'all'>(page);
  const [format, setFormat] = useState<'PDF' | 'XLSX'>('PDF');
  const [level, setLevel] = useState<'aggregate' | 'record'>('aggregate');
  useEffect(() => { if (open) setScope(page); }, [open, page]);
  const preview = activeInvestors().sort((a, b) => b.current - a.current).slice(0, 3);
  const confirm = () => {
    onClose();
    toast(`Demo export prepared: ${scope === 'all' ? 'all pages' : PAGES.find((p) => p.key === scope)?.label} (${format}). No file was generated.`);
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
              {l === 'aggregate' ? 'Aggregates only (bands, counts, totals)' : 'Record level (includes investor names)'}
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
                      <td className="px-3 py-1.5">{investorLabel(m.inv)}</td>
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
