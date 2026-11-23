// Finance tranche table: KLDX fees vs issuer pass-through vs pay-outs, due-date colours,
// a plain 'next action', and a nested payment schedule recorded one line at a time.
import { Check, ChevronDown, ChevronRight, Download, Pencil, RotateCcw, Wallet, X } from 'lucide-react';
import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { StatusBadge } from '../components/ui/Badge';
import { SearchInput, Select, Tabs } from '../components/ui/Primitives';
import { Panel } from '../components/ui/Showcase';
import { AS_OF } from '../data/asOf';
import { ISSUERS } from '../data/issuers';
import { dateShort, pct, rm } from '../lib/format';
import { issuerShort, type TrancheStats } from '../lib/selectors/finance';
import { dueIn, feeInvoices, feesByTranche, invoiceState, type Entry, type InvoiceState, type StepState } from '../lib/selectors/fees';
import { allocationTracker } from '../lib/selectors/operations';
import { useApp } from '../state/AppState';
import { invoiceOp, stepOp, type Change, type Editor, type Op, type Tone } from './FinanceEdit';

export type Flow = { steps: StepState[]; next: StepState | null };
export type InvRecords = Record<string, { date: string; ref: string; by: string }>;
export type Records = Record<string, Entry[]>;

const TH = 'whitespace-nowrap border-b border-line bg-sunken px-3 py-2.5 text-[11.5px] font-semibold text-ink-2';
const TD = 'border-b border-line/70 px-3 py-2.5 align-middle';
const STH = 'whitespace-nowrap border-b border-line px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3';
const STD = 'border-b border-line/60 px-2.5 py-1 align-middle text-[12.5px]';
const toBadge = (t: Tone) => (t === 'info' ? 'info' : t);

// ---------- helpers -------------------------------------------------------------------------

function csv(rows: (string | number)[][]) {
  return rows.map((r) => r.map((c) => (typeof c === 'number' ? String(c) : `"${String(c).replace(/"/g, '""')}"`)).join(',')).join('\n');
}
/** Hands the CSV to the viewer through the artifact viewer's downloads capability (asks the viewer to confirm). */
async function download(name: string, text: string, toast: (t: string, tone?: 'success' | 'info') => void) {
  type Downloads = { save: (r: { filename: string; data: string }) => Promise<{ status: string }> };
  const claude = (window as unknown as { claude?: { use: (n: string) => Promise<Downloads | null> } }).claude;
  try {
    const d = claude ? await claude.use('downloads') : null;
    if (!d) return toast('Export is not available in this view', 'info');
    const r = await d.save({ filename: name, data: text });
    if (r.status === 'saved') toast(`Exported ${name}`);
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code !== 'declined' && code !== 'dismissed') toast('Export was not saved', 'info');
  }
}

const DOT = { crit: 'bg-crit', warn: 'bg-warn', mute: 'bg-ink-3/50', good: 'bg-good', info: 'bg-info' } as const;
const TXT = { crit: 'text-crit font-semibold', warn: 'text-warn font-semibold', mute: 'text-ink-3', good: 'text-good', info: 'text-info' } as const;

interface Item { what: string; amount: number; due: string }

/** Due wording in the colour rule: "7 days overdue" (red), "due in 3 days" (amber), "due 18 Nov (26 days)" (grey). */
function dueWords(d: string): { tone: 'crit' | 'warn' | 'mute'; text: string } {
  const n = dueIn(d);
  if (n < 0) return { tone: 'crit', text: `${-n} day${n === -1 ? '' : 's'} overdue` };
  if (n === 0) return { tone: 'warn', text: 'due today' };
  if (n <= 10) return { tone: 'warn', text: `due in ${n} day${n === 1 ? '' : 's'}` };
  return { tone: 'mute', text: n <= 30 ? `due ${dateShort(d)} (${n} days)` : `due ${dateShort(d)} ${d.slice(2, 4)}` };
}

/** Shows what is owed and when: anything overdue first, otherwise the largest item. */
function Money({ items, settled }: { items: Item[]; settled?: boolean }) {
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  if (!items.length) return settled ? <span className="inline-flex items-center gap-1.5 text-[12.5px] text-good"><span className={`h-2 w-2 rounded-full ${DOT.good}`} />Settled</span> : <span className="text-ink-3">—</span>;
  const overdue = items.filter((x) => dueIn(x.due) < 0).sort((a, b) => a.due.localeCompare(b.due));
  const top = overdue[0] ?? [...items].sort((a, b) => b.amount - a.amount)[0];
  const total = items.reduce((a, x) => a + x.amount, 0);
  const d = dueWords(top.due);
  return (
    <span className="relative inline-block" onMouseMove={(e) => setTip({ x: e.clientX, y: e.clientY })} onMouseLeave={() => setTip(null)}>
      <span className="flex items-start gap-2">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[d.tone]}`} aria-hidden />
        <span className="min-w-0">
          <span className="num block max-w-[175px] leading-snug"><span className="whitespace-nowrap font-semibold">{rm(top.amount)}</span> <span className="text-ink-2">· {top.what}</span></span>
          <span className={`num block whitespace-nowrap text-[11.5px] ${TXT[d.tone]}`}>{d.text}</span>
          {items.length > 1 && <span className="num block whitespace-nowrap text-[11px] text-ink-3">+{items.length - 1} more · total {rm(total)}</span>}
        </span>
      </span>
      {tip && items.length > 1 && (
        <span role="tooltip" className="pointer-events-none fixed z-[80] w-[320px] rounded-xl border border-line bg-surface p-3 text-[12px] shadow-lift" style={{ left: Math.min(tip.x + 14, window.innerWidth - 330), top: tip.y + 14 }}>
          {items.map((it, k) => { const t = dueWords(it.due); return (
            <span key={k} className="flex items-center justify-between gap-3 py-0.5"><span className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${DOT[t.tone]}`} />{it.what}</span><span className="num whitespace-nowrap">{rm(it.amount)} · <span className={TXT[t.tone]}>{t.text}</span></span></span>); })}
        </span>
      )}
    </span>
  );
}

// ---------- row model -----------------------------------------------------------------------

interface Action { text: string; tone: Tone; p: number; amt: number }
interface Row {
  s: TrancheStats; steps: StepState[]; inv: InvoiceState[]; hold: boolean; fees: number; distShare: number;
  owed: Item[]; issuerDue: Item[]; payable: Item[]; action: Action; more: number; redeemed: boolean;
}

const isLive = (s: TrancheStats) => s.indicative || s.tranche.stage === 'Upcoming';
/** "P1", "P2"… for a payment step, counted by issuer payments in date order. */
const periodNo = (steps: StepState[], x: StepState) => steps.filter((y) => y.step.kind === 'issuer' && y.step.due <= x.step.due).length;
const FEE_SHORT: Record<string, string> = { 'Application fee': 'application', 'Legal DD fee': 'DD', 'Listing fee': 'listing', 'Custody fee': 'custody', 'Profit dist. fee': 'profit distribution' };
const feeName = (f: string) => ({ 'Initial listing fee': 'Listing fee', 'Annual listing fee': 'Listing fee', 'Application processing fee': 'Application fee', 'Legal due diligence fee': 'Legal DD fee', 'Profit distribution fee': 'Profit dist. fee' } as Record<string, string>)[f] ?? f;
const fmtD = (d: string) => `${dateShort(d)}${d.slice(0, 4) === AS_OF.slice(0, 4) ? '' : ` ${d.slice(2, 4)}`}`;

function buildRow(s: TrancheStats, flow: Flow, inv: InvoiceState[], hold: boolean, fees: { total: number; distribution: number } | undefined): Row {
  const steps = flow.steps;
  const nextIssuer = steps.find((x) => x.step.kind === 'issuer' && !x.done);
  const unpaid = inv.filter((i) => !i.paid);
  // KLDX's own fees still owed, one line per invoice date (e.g. "application + DD").
  const byDate = new Map<string, InvoiceState[]>();
  unpaid.forEach((i) => byDate.set(i.inv.date, [...(byDate.get(i.inv.date) ?? []), i]));
  const owed: Item[] = [...byDate.values()].map((g) => ({ what: g.map((i) => FEE_SHORT[feeName(i.inv.fee)] ?? feeName(i.inv.fee).toLowerCase()).join(' + '), amount: g.reduce((a, i) => a + i.outstanding, 0), due: g[0].inv.due }));
  // Issuer money for investors (pass-through): the next profit or principal payment.
  const issuerDue: Item[] = nextIssuer ? [{ what: `P${periodNo(steps, nextIssuer)} ${nextIssuer.received > 0 ? 'short' : nextIssuer.step.label.includes('principal') ? 'principal + profit' : 'profit'}`, amount: (nextIssuer.step.amount ?? 0) - nextIssuer.received, due: nextIssuer.step.due }] : [];
  const nextOut = steps.find((x) => (x.step.kind === 'release' || x.step.kind === 'investors') && !x.done);
  const payable: Item[] = nextOut ? [{ what: nextOut.step.kind === 'release' ? 'Release to issuer' : `Payout P${periodNo(steps, nextOut)}`, amount: nextOut.step.kind === 'investors' ? Math.round(((nextOut.step.amount ?? 0) * ((nextOut.step.total ?? 0) - nextOut.paid)) / (nextOut.step.total || 1)) : nextOut.step.amount ?? 0, due: nextOut.step.due }] : [];
  const redeemed = !isLive(s) && !steps.some((x) => !x.done && x.step.kind !== 'delist');

  // Candidate actions, most urgent first (p: 0 overdue … 5 waiting).
  const acts: Action[] = [];
  const who = issuerShort(s.tranche.issuerId).split(' ')[0];
  owed.forEach((o) => {
    const d = dueIn(o.due);
    if (d < 0) acts.push({ text: `Chase ${who} for KLDX fees ${rm(o.amount)} (${o.what}) · ${-d} days overdue`, tone: 'crit', p: 0, amt: o.amount });
    else if (d <= 10) acts.push({ text: `Collect KLDX fees ${rm(o.amount)} (${o.what}) from ${who} · due in ${d} days`, tone: 'warn', p: 5, amt: o.amount });
  });
  if (nextIssuer) {
    const d = dueIn(nextIssuer.step.due); const n = periodNo(steps, nextIssuer); const owed = (nextIssuer.step.amount ?? 0) - nextIssuer.received;
    if (d < 0) acts.push({ text: `Chase issuer P${n} ${rm(owed)} · ${-d} days overdue`, tone: 'crit', p: 0, amt: owed });
    else if (nextIssuer.received > 0 && d <= 30) acts.push({ text: `Chase issuer: ${rm(owed)} short on P${n} · due ${fmtD(nextIssuer.step.due)}`, tone: 'crit', p: 1, amt: owed });
    else if (d <= 10) acts.push({ text: `Collect issuer P${n} ${rm(owed)} for investors · due in ${d} days`, tone: 'warn', p: 2, amt: owed });
    else acts.push({ text: `Await issuer P${n} ${rm(owed)} for investors · ${fmtD(nextIssuer.step.due)}`, tone: 'mute', p: 5, amt: owed });
  }
  if (nextOut) {
    const d = dueIn(nextOut.step.due);
    if (nextOut.step.kind === 'release') {
      if (hold) acts.push({ text: `Release on hold: minting not done · due ${fmtD(nextOut.step.due)}`, tone: 'crit', p: 1, amt: nextOut.step.amount ?? 0 });
      else acts.push({ text: `Release ${rm(nextOut.step.amount ?? 0)} to issuer · by ${fmtD(nextOut.step.due)}`, tone: d <= 10 ? 'warn' : 'mute', p: d < 0 ? 0 : d <= 10 ? 2 : 4, amt: nextOut.step.amount ?? 0 });
    } else if (steps.some((y) => y.step.kind === 'issuer' && y.step.due === nextOut.step.due && y.done)) {
      acts.push({ text: `Pay investors P${periodNo(steps, nextOut)}: ${nextOut.paid}/${nextOut.step.total} paid · by ${fmtD(nextOut.step.due)}`, tone: d < 0 ? 'crit' : 'warn', p: d < 0 ? 0 : 2, amt: nextOut.step.amount ?? 0 });
    }
  }
  if (isLive(s)) acts.push({ text: s.tranche.stage === 'Upcoming' ? `Not open · opens ${fmtD(s.tranche.openDate)}` : `Fundraising · closes ${fmtD(s.tranche.closeDate)}`, tone: 'info', p: 6, amt: 0 });
  if (redeemed) acts.push({ text: 'No action · redeemed', tone: 'good', p: 7, amt: 0 });
  // Same urgency → larger amount first, so a small fee never leads over a big payment.
  acts.sort((a, b) => a.p - b.p || b.amt - a.amt);
  const action = acts[0] ?? { text: 'No action', tone: 'mute' as Tone, p: 8, amt: 0 };
  const more = acts.slice(1).filter((a) => a.p <= 3).length;
  return { s, steps, inv, hold, fees: fees?.total ?? 0, distShare: fees && fees.total ? fees.distribution / fees.total : 0, owed, issuerDue, payable, action, more, redeemed };
}

/** KLDX fees (our revenue): earned, and anything still owed with its due wording. */
function FeesCell({ r }: { r: Row }) {
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  const owedTotal = r.owed.reduce((a, x) => a + x.amount, 0);
  const top = [...r.owed].sort((a, b) => a.due.localeCompare(b.due))[0];
  const d = top ? dueWords(top.due) : null;
  const unpaid = r.inv.filter((i) => !i.paid);
  return (
    <span className="relative block" onMouseMove={(e) => unpaid.length && setTip({ x: e.clientX, y: e.clientY })} onMouseLeave={() => setTip(null)}>
      <span className="num block whitespace-nowrap text-[12.5px]"><span className="text-ink-3">Earned</span> <span className="font-medium">{rm(r.fees)}</span></span>
      {top && d ? (
        <span className="mt-0.5 flex items-start gap-1.5">
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[d.tone]}`} aria-hidden />
          <span className="min-w-0 text-[12px] leading-snug"><span className="num font-semibold">Owed {rm(owedTotal)}</span> <span className="text-ink-2">· {r.owed.length > 1 ? `${r.owed.length} invoices` : top.what}</span><span className={`num block text-[11.5px] ${TXT[d.tone]}`}>{r.owed.length > 1 ? 'oldest ' : ''}{d.text}</span></span>
        </span>
      ) : r.fees > 0 ? <span className="mt-0.5 block text-[11.5px] text-good">Nothing owed</span> : null}
      {tip && (
        <span role="tooltip" className="pointer-events-none fixed z-[80] w-[330px] rounded-xl border border-line bg-surface p-3 text-[12px] shadow-lift" style={{ left: Math.min(tip.x + 14, window.innerWidth - 340), top: tip.y + 14 }}>
          <span className="mb-1 block font-semibold">KLDX fee invoices owed by the issuer</span>
          {unpaid.map((i) => { const t = dueWords(i.inv.due); return <span key={i.inv.id} className="flex justify-between gap-3 py-0.5"><span>{i.inv.id} · {feeName(i.inv.fee)}</span><span className="num whitespace-nowrap">{rm(i.outstanding)} · <span className={TXT[t.tone]}>{t.text}</span></span></span>; })}
        </span>
      )}
    </span>
  );
}

/** Funding in plain words: not open yet / subscribed so far / raised. */
function FundingCell({ s }: { s: TrancheStats }) {
  const t = s.tranche;
  const m = (n: number) => `RM ${(n / 1e6).toFixed(2)}m`;
  if (t.stage === 'Upcoming') return <span className="block text-[12.5px]"><span className="block w-[150px] font-medium text-ink-2">Not open yet</span><span className="num block text-[11.5px] text-ink-3">opens {fmtD(t.openDate)} · target RM {(t.target / 1e6).toFixed(1)}m</span></span>;
  const live = isLive(s);
  const amt = live ? s.pending : s.successful;
  const f = Math.min(1, amt / t.target);
  return (
    <span className="block w-[150px]">
      <span className="relative block h-2 overflow-hidden rounded-full bg-sunken"><span className={`absolute inset-y-0 left-0 rounded-full ${s.risk === 'Critical' && live ? 'bg-crit' : 'bg-accent'}`} style={{ width: `${f * 100}%` }} /></span>
      <span className="num mt-1 block text-[12px] leading-snug"><span className="whitespace-nowrap"><span className="font-semibold">{m(amt)}</span> <span className="text-ink-2">{live ? 'subscribed' : 'raised'}</span></span> <span className="whitespace-nowrap text-ink-3">of RM {(t.target / 1e6).toFixed(1)}m ({pct(amt / t.target, 0)})</span></span>
    </span>
  );
}

function NextAction({ r }: { r: Row }) {
  const dot = r.action.tone === 'info' ? 'bg-info' : DOT[r.action.tone as keyof typeof DOT];
  const txt = r.action.tone === 'crit' ? 'text-crit font-semibold' : r.action.tone === 'warn' ? 'text-ink font-semibold' : r.action.tone === 'good' ? 'text-good' : 'text-ink-2';
  return (
    <span className="flex min-w-[205px] max-w-[260px] items-start gap-2">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden />
      <span className="min-w-0"><span className={`block text-[12.5px] leading-snug ${txt}`}>{r.action.text}</span>{r.more > 0 && <span className="block text-[11px] text-ink-3">+{r.more} more action{r.more === 1 ? '' : 's'}</span>}</span>
    </span>
  );
}

// ---------- shell ---------------------------------------------------------------------------

export function FinanceTables({ stats, flows, records, setRecords, invRecords, setInvRecords, stage, setStage }: {
  stats: TrancheStats[]; flows: Map<string, Flow>; records: Records; setRecords: (r: Records) => void; invRecords: InvRecords; setInvRecords: (r: InvRecords) => void;
  stage: string; setStage: (s: string) => void;
}) {
  const { thresholds, toast } = useApp();
  const [log, setLog] = useState<Change[]>([]);
  const [history, setHistory] = useState<{ records: Records; invRecords: InvRecords; log: Change[] }[]>([]);
  const { invoices } = useMemo(() => feeInvoices(thresholds), [thresholds]);
  const inv = invoices.map((i) => invoiceState(i, invRecords[i.id]));
  const ed: Editor = {
    log, canUndo: history.length > 0,
    apply: (ops: Op[]) => {
      if (!ops.length) return;
      setHistory((h) => [...h, { records, invRecords, log }]);
      const r = { ...records }; const ir = { ...invRecords };
      const at = `23 Oct 2026, ${new Date().toTimeString().slice(0, 5)}`;
      ops.forEach((o) => { if (o.type === 'entry') r[o.key] = [...(r[o.key] ?? []), o.entry]; else ir[o.id] = o.rec; });
      setRecords(r); setInvRecords(ir);
      setLog([...log, ...ops.map((o) => ({ key: o.type === 'entry' ? o.key : o.id, at, tranche: o.tranche, field: o.field, was: o.was, now: o.now, by: 'Finance User (you)' }))]);
      toast(`Saved · ${ops[0].field}`);
    },
    undo: () => {
      const prev = history.at(-1); if (!prev) return;
      setRecords(prev.records); setInvRecords(prev.invRecords); setLog(prev.log); setHistory(history.slice(0, -1));
      toast('Last change undone', 'info');
    },
  };
  return (
    <div id="payments" className="scroll-mt-28">
      <Panel icon={Wallet} title="Tranche position" info="KLDX fees are our revenue: earned to date and any invoices the issuer still owes us. Issuer payment due is money the issuer owes investors for profit or principal; KLDX receives it and pays it out. Due to pay out is what KLDX must pay: release funds to the issuer, or investor payouts. Colours: red overdue, amber due within 10 days, grey later, green settled. All figures synthetic.">
        <Position stats={stats} flows={flows} inv={inv} ed={ed} stage={stage} setStage={setStage} />
      </Panel>
    </div>
  );
}

// ---------- table ---------------------------------------------------------------------------

function Position({ stats, flows, inv, ed, stage, setStage }: {
  stats: TrancheStats[]; flows: Map<string, Flow>; inv: InvoiceState[]; ed: Editor; stage: string; setStage: (s: string) => void;
}) {
  const { thresholds, toast } = useApp();
  const fees = feesByTranche(thresholds);
  const holds = new Set(allocationTracker().filter((r) => r.steps.mint === 'blocked').map((r) => r.tranche.id));
  const [view, setView] = useState<'current' | 'historical' | 'all'>('current');
  const [q, setQ] = useState('');
  const [issuer, setIssuer] = useState('');
  const [open, setOpen] = useState<Set<string>>(new Set(['TR-2602']));
  const [tip, setTip] = useState<{ s: TrancheStats; x: number; y: number } | null>(null);

  const rows = stats.map((s) => buildRow(s, flows.get(s.tranche.id)!, inv.filter((i) => i.inv.trancheId === s.tranche.id), holds.has(s.tranche.id), fees.get(s.tranche.id)))
    .filter(({ s }) => {
      const t = s.tranche;
      if (stage) { if (t.stage !== stage) return false; }
      else if (view === 'current' && t.stage === 'Matured') return false;
      else if (view === 'historical' && t.stage !== 'Matured') return false;
      if (issuer && t.issuerId !== issuer) return false;
      if (q && !`${t.name} ${s.issuer} ${t.id}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  const firstDue = (r: Row) => [...r.owed, ...r.issuerDue, ...r.payable].map((x) => x.due).sort()[0] ?? '9999';
  rows.sort((a, b) => a.action.p - b.action.p || firstDue(a).localeCompare(firstDue(b)));
  const sum = (f: (r: Row) => number) => rows.reduce((a, r) => a + f(r), 0);
  const exportCsv = () => download('kldx-tranche-position.csv', csv([
    ['Tranche', 'ID', 'Stage', 'Target', 'Subscribed / raised', 'KLDX fees earned', 'KLDX fees owed', 'Fees owed due', 'Issuer payment due', 'Issuer due date', 'Due to pay out', 'Pay-out date', 'Next action'],
    ...rows.map((r) => { const o = [...r.owed].sort((a, b) => a.due.localeCompare(b.due))[0]; const i = r.issuerDue[0]; const p = r.payable[0]; return [r.s.tranche.name, r.s.tranche.id, r.s.tranche.stage, r.s.tranche.target, isLive(r.s) ? r.s.pending : r.s.successful, r.fees, r.owed.reduce((a, x) => a + x.amount, 0), o?.due ?? '', i?.amount ?? 0, i?.due ?? '', p?.amount ?? 0, p?.due ?? '', r.action.text]; }),
  ]), toast);

  return (
    <>
      <div className="flex flex-wrap items-end gap-3 border-y border-line px-6 py-3">
        {stage ? <span className="inline-flex h-8 items-center gap-2 rounded-full bg-accent-soft px-3 text-[12.5px] font-medium text-accent-ink">Stage: {stage}<button onClick={() => setStage('')} aria-label="Clear stage filter"><X size={13} /></button></span>
          : <Tabs label="Tranche set" value={view} onChange={setView} tabs={[{ key: 'current', label: 'Current' }, { key: 'historical', label: 'Historical' }, { key: 'all', label: 'All' }]} />}
        <SearchInput id="pos-q" value={q} onChange={setQ} placeholder="Tranche, issuer or ID" />
        <Select id="pos-issuer" label="Issuer" value={issuer} onChange={setIssuer} options={[{ value: '', label: 'All issuers' }, ...ISSUERS.map((i) => ({ value: i.id, label: issuerShort(i.id) }))]} />
        <span className="ml-auto flex flex-wrap items-center gap-2">
          <button onClick={exportCsv} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-[12.5px] font-medium hover:bg-sunken"><Download size={14} aria-hidden />Export CSV</button>
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-[13px] [&>tbody>tr>td]:px-2.5 [&>thead>tr>th]:px-2.5">
          <caption className="sr-only">Tranche position</caption>
          <thead><tr>
            {['Tranche', 'Funding', 'KLDX fees', 'Issuer payment due', 'Due to pay out', 'Next action', ''].map((h, i) => <th key={i} scope="col" className={`${TH} ${i === 0 ? 'pl-6' : ''}`}>{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map((r) => {
              const t = r.s.tranche;
              const isOpen = open.has(t.id);
              const toggle = () => setOpen((o) => { const n = new Set(o); if (n.has(t.id)) n.delete(t.id); else n.add(t.id); return n; });
              return (
                <Fragment key={t.id}>
                  <tr className={`cursor-pointer ${isOpen ? 'bg-accent-soft/50' : 'hover:bg-sunken/60'}`} onClick={toggle}>
                    <td className={`${TD} pl-6`}><span className="whitespace-nowrap"><span className="block font-semibold">{t.id}</span><span className="block text-[12px] text-ink-2">{t.name}</span></span></td>
                    <td className={TD} onMouseMove={(e) => setTip({ s: r.s, x: e.clientX, y: e.clientY })} onMouseLeave={() => setTip(null)}><FundingCell s={r.s} /></td>
                    <td className={TD}><FeesCell r={r} /></td>
                    <td className={TD}><Money items={r.issuerDue} settled={r.redeemed} /></td>
                    <td className={TD}><Money items={r.payable} settled={r.redeemed} /></td>
                    <td className={TD}><NextAction r={r} /></td>
                    <td className={`${TD} w-10 pr-4`}><button onClick={(e) => { e.stopPropagation(); toggle(); }} aria-expanded={isOpen} aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${t.name}`} className="grid h-7 w-7 place-items-center rounded-lg hover:bg-sunken">{isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button></td>
                  </tr>
                  {isOpen && <tr><td colSpan={7} className="border-b border-line bg-canvas/60 p-0"><Detail r={r} ed={ed} onClose={toggle} /></td></tr>}
                </Fragment>
              );
            })}
          </tbody>
          <tfoot><tr className="font-semibold">
            <td className="border-t-2 border-line px-3 py-2.5 pl-6">Total · {rows.length} tranches</td>
            <td className="border-t-2 border-line px-3 py-2.5" />
            <td className="num border-t-2 border-line px-3 py-2.5"><span className="block whitespace-nowrap">Earned {rm(sum((r) => r.fees))}</span><span className="block whitespace-nowrap text-[11px]">Owed {rm(sum((r) => r.owed.reduce((a, x) => a + x.amount, 0)))} · <span className="text-crit">{rm(sum((r) => r.owed.filter((x) => dueIn(x.due) < 0).reduce((a, x) => a + x.amount, 0)))} overdue</span></span></td>
            <td className="num border-t-2 border-line px-3 py-2.5">{rm(sum((r) => r.issuerDue.reduce((a, x) => a + x.amount, 0)))}<span className="block text-[11px] font-normal text-ink-3">from issuers, for investors</span></td>
            <td className="num border-t-2 border-line px-3 py-2.5">{rm(sum((r) => r.payable.reduce((a, x) => a + x.amount, 0)))}<span className="block text-[11px] font-normal text-ink-3">{rm(sum((r) => r.payable.filter((x) => dueIn(x.due) <= 10).reduce((a, x) => a + x.amount, 0)))} within 10 days</span></td>
            <td className="border-t-2 border-line px-3 py-2.5" colSpan={2} />
          </tr></tfoot>
        </table>
      </div>
      <p className="px-6 py-2.5 text-[11.5px] text-ink-3"><span className="mr-1 font-semibold">Dots:</span><span className="mr-3 inline-flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${DOT.crit}`} />overdue</span><span className="mr-3 inline-flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${DOT.warn}`} />due within 10 days</span><span className="mr-3 inline-flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${DOT.mute}`} />later</span><span className="inline-flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${DOT.good}`} />settled</span> · Hover Funding or KLDX fees for detail. Click a row to record payments.</p>
      {tip && <FundingTip s={tip.s} x={tip.x} y={tip.y} />}
    </>
  );
}

function FundingTip({ s, x, y }: { s: TrancheStats; x: number; y: number }) {
  const live = isLive(s);
  const facts: [string, string][] = [
    ['Target', rm(s.tranche.target)],
    [live ? 'Subscribed so far (not yet allocated)' : 'Raised (allocated)', rm(live ? s.pending : s.successful)],
    ['Gross requests', rm(s.gross)],
    ['Subscribers', String(s.subscribers)],
    [live ? 'Closes' : 'Closed', `${dateShort(s.tranche.closeDate)} ${s.tranche.closeDate.slice(0, 4)}`],
  ];
  return (
    <div role="tooltip" className="pointer-events-none fixed z-[80] w-[260px] rounded-xl border border-line bg-surface p-3.5 text-[12.5px] shadow-lift" style={{ left: Math.min(x + 16, window.innerWidth - 270), top: Math.min(y + 16, window.innerHeight - 190) }}>
      <div className="mb-2 font-semibold">{s.tranche.name} · {pct(s.fulfilment, 0)} funded</div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">{facts.map(([k, v]) => <Fragment key={k}><dt className="text-ink-3">{k}</dt><dd className="num text-right">{v}</dd></Fragment>)}</dl>
    </div>
  );
}

// ---------- nested detail: payment schedule only, edit one row at a time ---------------------

type SRow =
  | { kind: 'step'; key: string; x: StepState; item: ReactNode; due: string }
  | { kind: 'fee'; key: string; i: InvoiceState; item: ReactNode; due: string };

function Detail({ r, ed, onClose }: { r: Row; ed: Editor; onClose: () => void }) {
  const t = r.s.tranche;
  const [editing, setEditing] = useState<string | null>(null);
  const live = r.steps.length === 0;
  const totalOf = (xs: Item[]) => xs.reduce((a, x) => a + x.amount, 0);
  const figs: [string, ReactNode][] = [
    ['Target raise', rm(t.target)], [live ? 'Subscribed so far' : 'Raised', rm(live ? r.s.pending : r.s.successful)], ['KLDX fees earned', rm(r.fees)],
    ['KLDX fees owed', rm(totalOf(r.owed))], ['Issuer payment due', rm(totalOf(r.issuerDue))], ['Due to pay out', rm(totalOf(r.payable))],
  ];
  const dir = (from: string, to: string) => <span className="text-ink-3">{from} <span aria-hidden>→</span> {to} ·</span>;
  const sched: SRow[] = [
    ...r.steps.filter((x) => x.step.kind !== 'delist').map((x) => {
      const n = periodNo(r.steps, x); const what = `P${n} ${x.step.label.includes('principal') ? 'principal + profit' : 'profit'}`;
      const item = x.step.kind === 'release' ? <>{dir('KLDX', 'issuer')} Release proceeds</>
        : x.step.kind === 'issuer' ? <>{dir('Issuer', 'KLDX')} {what}</>
        : <>{dir('KLDX', 'investors')} {what} <span className="num text-ink-3">({x.paid}/{x.step.total})</span></>;
      return { kind: 'step' as const, key: x.step.key, x, due: x.step.due, item };
    }),
    ...r.inv.filter((i) => i.inv.collection === 'Invoice').map((i) => ({ kind: 'fee' as const, key: i.inv.id, i, due: i.inv.due, item: <><span className="text-ink-3">Fee ·</span> {feeName(i.inv.fee).replace(/ fee$/, '')} <span className="num text-[11.5px] text-ink-3">{i.inv.id}</span></> })),
  ].sort((a, b) => a.due.localeCompare(b.due) || (a.kind === 'fee' ? 1 : 0) - (b.kind === 'fee' ? 1 : 0));
  const deducted = r.inv.filter((i) => i.inv.collection !== 'Invoice');
  const lastChange = (key: string) => [...ed.log].reverse().find((c) => c.key === key);

  return (
    <div className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
      <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-accent/30 bg-accent-soft/40 px-4 py-2.5">
        <span className="flex items-center gap-2.5"><span className="font-display text-[17px] font-semibold">{t.id}</span><span className="text-[14px]">{t.name}</span></span>
        <span className="flex flex-wrap gap-x-5 gap-y-1">{figs.map(([k, v]) => <span key={k} className="border-l border-line pl-4 first:border-0 first:pl-0"><span className="block text-[11px] text-ink-3">{k}</span><span className="num block text-[13.5px] font-semibold">{v}</span></span>)}</span>
        <button onClick={onClose} aria-label="Close detail" className="ml-auto grid h-7 w-7 place-items-center rounded-lg hover:bg-surface"><X size={16} /></button>
      </div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-display text-[16px] font-semibold">Payment schedule <span className="font-sans text-[12px] font-normal text-ink-3">· {sched.length} items, by due date</span></h4>
        {ed.canUndo && <button onClick={ed.undo} className="inline-flex items-center gap-1 text-[12px] font-medium text-accent-ink hover:underline"><RotateCcw size={12} />Undo last change</button>}
      </div>
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left">
          <thead><tr>{['No.', 'Due date', 'Item', 'Amount due', 'Received / paid', 'Date', 'Bank ref', 'Status', ''].map((h, i) => <th key={i} className={`${STH} ${i === 3 || i === 4 ? 'text-right' : ''}`}>{h}</th>)}</tr></thead>
          <tbody>
            {sched.map((row, k) => {
              const isEdit = editing === row.key;
              const change = lastChange(row.key);
              return (
                <tr key={row.key} onDoubleClick={() => !isEdit && setEditing(row.key)} className={`${isEdit ? 'bg-accent-soft/50' : row.kind === 'fee' ? 'bg-sunken/30 hover:bg-sunken/50' : 'hover:bg-sunken/40'}`}>
                  {isEdit
                    ? <RowEditor row={row} n={k + 1} r={r} onCancel={() => setEditing(null)} onSave={(op) => { ed.apply([op]); setEditing(null); }} />
                    : <ScheduleCells row={row} n={k + 1} r={r} change={change} onEdit={() => setEditing(row.key)} />}
                </tr>
              );
            })}
          </tbody>
        </table>
        {deducted.length > 0 && <p className="border-t border-line px-3 py-2 text-[11.5px] text-ink-3">Not listed because they are deducted at source: {deducted.map((i) => `${feeName(i.inv.fee).toLowerCase()} ${rm(i.inv.amount)}`).join(', ')}. Shaded rows are KLDX fee invoices.</p>}
      </div>
      <p className="mt-2 text-[11.5px] text-ink-3">To record a payment, click ✎ (or double-click the line), fill in the amount, date and bank ref, then ✓. Esc cancels. Prototype: records are kept in this browser only and reset when the page reloads.</p>
    </div>
  );
}

const statusOfRow = (row: SRow, r: Row): { label: string; tone: Tone } => {
  if (row.kind === 'step') return stepStatus(row.x, r);
  const i = row.i;
  return i.paid ? { label: 'Paid', tone: 'good' } : i.overdueDays ? { label: `Overdue ${i.overdueDays}d`, tone: 'crit' } : { label: 'Invoiced', tone: 'warn' };
};

function ScheduleCells({ row, n, r, change, onEdit }: { row: SRow; n: number; r: Row; change?: Change; onEdit: () => void }) {
  const st = statusOfRow(row, r);
  const amountDue = row.kind === 'step' ? row.x.step.amount ?? 0 : row.i.inv.amount;
  let got: ReactNode = <span className="text-ink-3">—</span>;
  let date: string | undefined; let ref: string | undefined;
  if (row.kind === 'step') {
    const x = row.x; const e = x.entries.at(-1);
    const amt = x.step.kind === 'issuer' ? x.received : x.step.kind === 'investors' ? Math.round(((x.step.amount ?? 0) * x.paid) / (x.step.total || 1)) : x.done ? x.step.amount ?? 0 : 0;
    if (amt) got = <>{rm(amt)}{x.step.kind === 'issuer' && !x.done && <span className="block text-[11px] font-semibold text-crit">short {rm(amountDue - amt)}</span>}</>;
    date = e?.date; ref = e?.ref;
  } else if (row.i.paid) { got = rm(row.i.inv.amount); date = row.i.paid.date; ref = row.i.paid.ref; }
  const d = dueIn(row.due);
  const done = st.tone === 'good';
  return (
    <>
      <td className={`${STD} num w-10 text-ink-3`}>{n}</td>
      <td className={`${STD} num whitespace-nowrap`}><span className={!done && d < 0 ? 'font-semibold text-crit' : !done && d <= 10 ? 'font-semibold text-warn' : ''}>{fmtD(row.due)}</span></td>
      <td className={`${STD} whitespace-nowrap`}>{row.item}{change && <span className="block text-[11px] text-ink-3">Updated {change.at.replace('23 Oct 2026, ', '23 Oct, ')} by {change.by.replace(' (you)', '')}</span>}</td>
      <td className={`${STD} num whitespace-nowrap text-right`}>{rm(amountDue)}</td>
      <td className={`${STD} num whitespace-nowrap text-right`}>{got}</td>
      <td className={`${STD} num whitespace-nowrap`}>{date ? fmtD(date) : <span className="text-ink-3">—</span>}</td>
      <td className={`${STD} num whitespace-nowrap text-[12px]`}>{ref ?? <span className="text-ink-3">—</span>}</td>
      <td className={STD}><StatusBadge status={st.label} tone={toBadge(st.tone)} /></td>
      <td className={`${STD} w-10`}>{!(row.kind === 'step' && row.x.done && row.x.step.kind !== 'issuer') && <button onClick={onEdit} aria-label={`Record or edit line ${n}`} className="grid h-7 w-7 place-items-center rounded-lg text-accent-ink hover:bg-accent-soft"><Pencil size={14} /></button>}</td>
    </>
  );
}

function RowEditor({ row, n, r, onSave, onCancel }: { row: SRow; n: number; r: Row; onSave: (op: Op) => void; onCancel: () => void }) {
  const isStep = row.kind === 'step';
  const x = isStep ? row.x : null;
  const kind = x?.step.kind;
  const last = x?.entries.at(-1);
  const amountDue = isStep ? x!.step.amount ?? 0 : row.i.inv.amount;
  const [amount, setAmount] = useState(String(kind === 'issuer' ? amountDue : amountDue));
  const [count, setCount] = useState(String(x?.step.total ?? 0));
  const [date, setDate] = useState(AS_OF);
  const [ref, setRef] = useState(isStep ? last?.ref ?? '' : row.i.paid?.ref ?? '');
  const [err, setErr] = useState('');
  const box = 'num h-7 w-full rounded-md border border-accent bg-surface px-1.5 text-[12.5px] outline-none ring-2 ring-accent/20';
  const save = () => {
    if (ref.trim().length < 4) return setErr('Add the bank / payment ref');
    if (!isStep) { const op = invoiceOp(row.i, 'ref', ref, undefined, r.s.tranche.name); if (typeof op === 'string') return setErr(op); if (op.type === 'inv') op.rec.date = date; return onSave(op); }
    const field = kind === 'issuer' ? 'amount' : kind === 'investors' ? 'count' : 'ref';
    const op = stepOp(x!, field, field === 'amount' ? amount : field === 'count' ? count : ref, ref, `line ${n}`, r.s.tranche.name);
    if (typeof op === 'string') return setErr(op);
    if (op.type === 'entry') op.entry.date = date;
    onSave(op);
  };
  const keys = (e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); save(); } if (e.key === 'Escape') { e.preventDefault(); onCancel(); } };
  return (
    <>
      <td className={`${STD} num w-10 text-ink-3`}>{n}</td>
      <td className={`${STD} num whitespace-nowrap`}>{fmtD(row.due)}</td>
      <td className={`${STD} whitespace-nowrap`}>{row.item}{err && <span role="alert" className="block text-[11px] font-semibold text-crit">{err}</span>}</td>
      <td className={`${STD} num whitespace-nowrap text-right`}>{rm(amountDue)}</td>
      <td className={`${STD} text-right`}>
        {kind === 'investors'
          ? <label className="flex items-center justify-end gap-1 text-[11.5px] text-ink-3"><input aria-label="Investors paid" autoFocus value={count} onChange={(e) => { setCount(e.target.value); setErr(''); }} onKeyDown={keys} className={`${box} w-14 text-right`} />of {x!.step.total} paid</label>
          : kind === 'issuer'
            ? <input aria-label="Total received" autoFocus inputMode="numeric" value={amount} onChange={(e) => { setAmount(e.target.value); setErr(''); }} onKeyDown={keys} className={`${box} w-32 text-right`} />
            : <span className="num text-ink-2">{rm(amountDue)}</span>}
      </td>
      <td className={STD}><input aria-label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} onKeyDown={keys} className={`${box} w-[132px]`} /></td>
      <td className={STD}><input aria-label="Bank ref" autoFocus={kind !== 'issuer' && kind !== 'investors'} placeholder="e.g. MBB-261023-4821" value={ref} onChange={(e) => { setRef(e.target.value); setErr(''); }} onKeyDown={keys} className={`${box} w-40`} /></td>
      <td className={STD} colSpan={2}>
        <span className="flex gap-1">
          <button onClick={save} aria-label="Save line" className="grid h-7 w-7 place-items-center rounded-md bg-accent text-white hover:opacity-90"><Check size={14} strokeWidth={3} /></button>
          <button onClick={onCancel} aria-label="Cancel" className="grid h-7 w-7 place-items-center rounded-md border border-line bg-surface text-ink-2 hover:bg-sunken"><X size={14} /></button>
        </span>
      </td>
    </>
  );
}

function stepStatus(x: StepState, r: Row): { label: string; tone: Tone } {
  if (x.done) return { label: x.step.kind === 'issuer' ? 'Received' : x.step.kind === 'investors' ? 'Paid' : 'Completed', tone: 'good' };
  const d = dueIn(x.step.due);
  if (x.step.kind === 'release') return r.hold ? { label: 'On hold', tone: 'crit' } : d < 0 ? { label: 'Overdue', tone: 'crit' } : { label: d <= 10 ? 'Due soon' : 'Upcoming', tone: d <= 10 ? 'warn' : 'info' };
  if (x.step.kind === 'issuer') return x.received > 0 && d <= 30 ? { label: 'Shortfall', tone: 'crit' } : d < 0 ? { label: 'Overdue', tone: 'crit' } : { label: d <= 10 ? 'Due soon' : 'Upcoming', tone: d <= 10 ? 'warn' : 'info' };
  const funded = r.steps.some((y) => y.step.kind === 'issuer' && y.step.due === x.step.due && y.done);
  if (x.paid > 0) return { label: 'Part paid', tone: 'warn' };
  return funded ? { label: 'Ready to pay', tone: 'warn' } : { label: 'Awaiting issuer', tone: 'mute' };
}
