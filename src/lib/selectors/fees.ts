// Synthetic fee model from the KLDX Fees & Charges schedule (30.03.2026), standard fees.
import { AS_OF, daysFromAsOf, monthKey } from '../../data/asOf';
import type { Thresholds } from '../../data/thresholds';
import { allTrancheStats, isAllocatedStage, type TrancheStats } from './finance';
import { allocatedInvestors } from './operations';

export const addMonths = (iso: string, n: number) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + n, d)).toISOString().slice(0, 10);
};

/** Five display groups (validated categorical palette, fixed order). */
export const FEE_GROUPS = [
  { key: 'distribution', label: 'Distribution fee', light: '#4f4cc0', dark: '#7d79ea', note: 'Fee rate on successful subscriptions, at close' },
  { key: 'onboarding', label: 'Application & legal DD', light: '#0E9F9A', dark: '#12A08F', note: 'RM 50,000 + RM 30,000 per project' },
  { key: 'listing', label: 'Listing & custody', light: '#a58be6', dark: '#9c82e0', note: 'Initial and annual listing RM 25,000; custody 0.1% p.a. of tokens in circulation' },
  { key: 'payment', label: 'Payment & service fees', light: '#c9a24a', dark: '#b08a3c', note: 'Profit distribution 0.5% (issuer) and service fee 1% of profit (investor)' },
  { key: 'delisting', label: 'Delisting fee', light: '#2A6FBF', dark: '#4A86E0', note: '1% of tokens in circulation when delisted, including at maturity' },
] as const;
export type FeeGroup = (typeof FEE_GROUPS)[number]['key'];

export interface FeeEvent { trancheId: string; date: string; group: FeeGroup; name: string; amount: number }

export interface Payment { key: string; due: string; type: 'Profit payment' | 'Principal + profit'; amount: number; profit: number }

/** Half-yearly profit from the issue date; principal plus the final period's profit at maturity (assumption). */
export function paymentSchedule(s: TrancheStats): Payment[] {
  const t = s.tranche;
  if (!isAllocatedStage(t.stage)) return [];
  const out: Payment[] = [];
  let last = 0;
  for (let k = 6; k < t.tenorMonths; k += 6) {
    const profit = Math.round(s.successful * t.profitRate * 0.5);
    out.push({ key: `${t.id}:${k}`, due: addMonths(t.issueDate, k), type: 'Profit payment', amount: profit, profit });
    last = k;
  }
  const profit = Math.round(s.successful * t.profitRate * ((t.tenorMonths - last) / 12));
  out.push({ key: `${t.id}:mat`, due: t.maturityDate, type: 'Principal + profit', amount: s.successful + profit, profit });
  return out;
}

/** Every fee earned up to the reporting date. */
export function feeEvents(th: Thresholds): FeeEvent[] {
  const ev: FeeEvent[] = [];
  const add = (trancheId: string, date: string, group: FeeGroup, name: string, amount: number) => {
    if (date <= AS_OF && amount > 0) ev.push({ trancheId, date, group, name, amount: Math.round(amount) });
  };
  for (const s of allTrancheStats(th)) {
    const t = s.tranche;
    const appDate = addMonths(t.openDate, -2);
    add(t.id, appDate, 'onboarding', 'Application processing fee', 50_000);
    add(t.id, appDate, 'onboarding', 'Legal due diligence fee', 30_000);
    if (!isAllocatedStage(t.stage)) continue;
    add(t.id, t.closeDate, 'distribution', 'Distribution fee', s.revenue);
    if (t.stage === 'Closed') continue;
    add(t.id, t.issueDate, 'listing', 'Initial listing fee', 25_000);
    for (let k = 12; k < t.tenorMonths; k += 12) add(t.id, addMonths(t.issueDate, k), 'listing', 'Annual listing fee', 25_000);
    for (let m = 1; m <= t.tenorMonths; m++) add(t.id, addMonths(t.issueDate, m), 'listing', 'Custody fee', (s.successful * 0.001) / 12);
    for (const p of paymentSchedule(s)) {
      if (p.due >= AS_OF) continue;
      add(t.id, p.due, 'payment', 'Profit distribution fee', p.profit * 0.005);
      add(t.id, p.due, 'payment', 'Service fee', p.profit * 0.01);
    }
    add(t.id, t.maturityDate, 'delisting', 'Delisting fee', s.successful * 0.01);
  }
  return ev;
}

export function feesByMonth(th: Thresholds, months: string[]) {
  const ev = feeEvents(th);
  return months.map((m) => {
    const row: Record<string, number | string> = { month: m, total: 0 };
    FEE_GROUPS.forEach((g) => (row[g.key] = 0));
    ev.filter((e) => monthKey(e.date) === m).forEach((e) => { row[e.group] = (row[e.group] as number) + e.amount; row.total = (row.total as number) + e.amount; });
    return row;
  });
}

export const feesIn = (th: Thresholds, start: string, end: string) =>
  feeEvents(th).filter((e) => e.date >= start && e.date <= end).reduce((a, e) => a + e.amount, 0);

export const feesByTranche = (th: Thresholds) => {
  const m = new Map<string, Record<FeeGroup | 'total', number>>();
  for (const e of feeEvents(th)) {
    const r = m.get(e.trancheId) ?? { distribution: 0, onboarding: 0, listing: 0, payment: 0, delisting: 0, total: 0 };
    r[e.group] += e.amount; r.total += e.amount;
    m.set(e.trancheId, r);
  }
  return m;
};

// ---- Payment workflow (Release funds → Issuer pays → Investors paid → next) ------------------

export type StepKind = 'release' | 'issuer' | 'investors' | 'delist' | 'live';
export interface Entry { date: string; by: string; amount?: number; count?: number; ref?: string }
export interface Step {
  key: string; kind: StepKind; label: string; due: string; amount?: number; total?: number;
  /** Synthetic entries already recorded before the reporting date. */
  base: Entry[];
}

/** Synthetic issuer funding already received for the next open payment (fraction). */
const FUNDED: Record<string, number> = { 'TR-2602': 0.85, 'TR-2605': 1 };
/** Synthetic release dates for tranches issued earlier (from the allocation tracker or the issue date). */
const BY = 'Finance team';

/** Deterministic synthetic bank reference, e.g. MBB-260918-4821. */
export function bankRef(seed: string, date: string, bank?: string) {
  let h = 7;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const b = bank ?? ['MBB', 'CIMB', 'PBB', 'RHB'][h % 4];
  return `${b}-${date.slice(2, 4)}${date.slice(5, 7)}${date.slice(8, 10)}-${String(1000 + (h % 9000))}`;
}

export function workflow(s: TrancheStats, releasedOn: string | null): Step[] {
  const t = s.tranche;
  if (!isAllocatedStage(t.stage)) return [];
  const N = allocatedInvestors(t.id).length;
  const steps: Step[] = [];
  const issued = t.stage !== 'Closed';
  steps.push({ key: `${t.id}:release`, kind: 'release', label: 'Release funds to issuer', due: t.issueDate, amount: s.successful,
    base: issued ? [{ date: releasedOn ?? t.issueDate, by: BY, amount: s.successful, ref: bankRef(`${t.id}rel`, releasedOn ?? t.issueDate) }] : [] });
  let firstOpen = true;
  for (const p of paymentSchedule(s)) {
    const past = p.due < AS_OF;
    let issuerBase: Entry[] = [];
    if (past) issuerBase = [{ date: addMonths(p.due, 0), by: BY, amount: p.amount, ref: bankRef(`${p.key}iss`, p.due) }];
    else if (firstOpen) {
      const f = FUNDED[t.id] ?? 0;
      if (f > 0) issuerBase = [{ date: '2026-10-20', by: BY, amount: Math.round(p.amount * f), ref: bankRef(`${p.key}iss`, '2026-10-20') }];
      firstOpen = false;
    }
    steps.push({ key: `${p.key}:issuer`, kind: 'issuer', label: `Issuer pays · ${p.type.toLowerCase()}`, due: p.due, amount: p.amount, base: issuerBase });
    steps.push({ key: `${p.key}:investors`, kind: 'investors', label: `Pay investors · ${p.type.toLowerCase()}`, due: p.due, amount: p.amount, total: N,
      base: past ? [{ date: p.due, by: BY, count: N, ref: `PAYRUN-${p.due.replace(/-/g, '')}` }] : [] });
  }
  steps.push({ key: `${t.id}:delist`, kind: 'delist', label: 'Redeemed & delisted', due: t.maturityDate, base: t.maturityDate < AS_OF ? [{ date: t.maturityDate, by: BY }] : [] });
  return steps;
}

export interface StepState { step: Step; entries: Entry[]; received: number; paid: number; done: boolean }

export function stepState(step: Step, extra: Entry[] = []): StepState {
  const entries = [...step.base, ...extra];
  const received = entries.reduce((a, e) => a + (e.amount ?? 0), 0);
  const paid = Math.max(0, ...entries.map((e) => e.count ?? 0));
  const done = step.kind === 'issuer' ? received >= (step.amount ?? 0) : step.kind === 'investors' ? paid >= (step.total ?? 0) && entries.length > 0 : entries.length > 0;
  return { step, entries, received, paid, done };
}

export const dueIn = (d: string) => daysFromAsOf(d);

// ---- Fee invoices (receivables) ----------------------------------------------------------------

export type Collection = 'Invoice' | 'Deducted at release' | 'Deducted at payout';
export interface Invoice {
  id: string; trancheId: string; issuerId: string; fee: string; group: FeeGroup; date: string; due: string; amount: number;
  collection: Collection; base: { date: string; ref: string } | null;
}

const quarterEnd = (d: string) => { const [y, m] = d.split('-').map(Number); const qm = Math.ceil(m / 3) * 3; return new Date(Date.UTC(y, qm, 0)).toISOString().slice(0, 10); };
/** Synthetic unpaid invoices kept overdue so receivables have something to show. */
const OVERDUE = new Set(['TR-2615:Application processing fee', 'TR-2615:Legal due diligence fee', 'TR-2609:Initial listing fee']);

/**
 * One invoice per fee, except: custody billed quarterly in arrears; distribution fee deducted from the funds released
 * to the issuer; service fee deducted from investor payouts. Fees earned but not yet invoiced (custody for the current
 * quarter) are 'unbilled'.
 */
export function feeInvoices(th: Thresholds): { invoices: Invoice[]; unbilled: Map<string, number> } {
  const stats = new Map(allTrancheStats(th).map((s) => [s.tranche.id, s]));
  const raw: Omit<Invoice, 'id'>[] = [];
  const unbilled = new Map<string, number>();
  const custody = new Map<string, number>();
  for (const e of feeEvents(th)) {
    const t = stats.get(e.trancheId)!.tranche;
    if (e.name === 'Custody fee') {
      const qe = quarterEnd(e.date);
      if (qe > AS_OF) { unbilled.set(e.trancheId, (unbilled.get(e.trancheId) ?? 0) + e.amount); continue; }
      const k = `${e.trancheId}|${qe}`;
      custody.set(k, (custody.get(k) ?? 0) + e.amount);
      continue;
    }
    const collection: Collection = e.name === 'Distribution fee' ? 'Deducted at release' : e.name === 'Service fee' ? 'Deducted at payout' : 'Invoice';
    raw.push({ trancheId: e.trancheId, issuerId: t.issuerId, fee: e.name, group: e.group, date: e.date, due: addMonths(e.date, 1), amount: e.amount, collection, base: null });
  }
  for (const [k, amount] of custody) {
    const [trancheId, qe] = k.split('|');
    raw.push({ trancheId, issuerId: stats.get(trancheId)!.tranche.issuerId, fee: 'Custody fee', group: 'listing', date: qe, due: addMonths(qe, 1), amount: Math.round(amount), collection: 'Invoice', base: null });
  }
  raw.sort((a, b) => a.date.localeCompare(b.date) || a.trancheId.localeCompare(b.trancheId));
  const invoices = raw.map((r, i) => {
    const id = `INV-F-${String(i + 1).padStart(4, '0')}`;
    const odKey = r.fee === 'Custody fee' ? `${r.trancheId}:${r.fee}:${r.date}` : `${r.trancheId}:${r.fee}`;
    let base: Invoice['base'] = null;
    if (r.collection !== 'Invoice') base = { date: r.date, ref: r.collection === 'Deducted at release' ? 'Netted from release' : 'Netted from payout' };
    else if (r.due < AS_OF && !OVERDUE.has(odKey)) {
      // Paid 10–25 days after invoicing (deterministic), never before the invoice date or after the reporting date.
      let h = 0; for (const c of id) h = (h * 33 + c.charCodeAt(0)) >>> 0;
      const d = new Date(Date.parse(r.date) + (10 + (h % 16)) * 86_400_000).toISOString().slice(0, 10);
      const pd = d > AS_OF ? AS_OF : d;
      base = { date: pd, ref: bankRef(id, pd) };
    }
    return { ...r, id, base };
  });
  return { invoices, unbilled };
}

export interface InvoiceState { inv: Invoice; paid: { date: string; ref: string; amount: number; by: string } | null; outstanding: number; overdueDays: number; status: 'Paid' | 'Deducted' | 'Overdue' | 'Outstanding' }
export function invoiceState(inv: Invoice, rec?: { date: string; ref: string; by: string }): InvoiceState {
  const paid = rec ? { ...rec, amount: inv.amount } : inv.base ? { ...inv.base, amount: inv.amount, by: BY } : null;
  const outstanding = paid ? 0 : inv.amount;
  const overdueDays = paid ? 0 : Math.max(0, -daysFromAsOf(inv.due));
  const status = paid ? (inv.collection === 'Invoice' ? 'Paid' : 'Deducted') : overdueDays > 0 ? 'Overdue' : 'Outstanding';
  return { inv, paid, outstanding, overdueDays, status };
}
