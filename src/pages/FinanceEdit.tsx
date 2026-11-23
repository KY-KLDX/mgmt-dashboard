// Recording primitives for the Finance payment schedule: turn an edited line into a logged change.
import { AS_OF } from '../data/asOf';
import { dateShort, rm } from '../lib/format';
import { type Entry, type InvoiceState, type StepState } from '../lib/selectors/fees';

export type Tone = 'crit' | 'warn' | 'good' | 'mute' | 'info';
export const ME = 'Finance User (you)';

export type Op =
  | { type: 'entry'; key: string; entry: Entry; tranche: string; field: string; was: string; now: string }
  | { type: 'inv'; id: string; rec: { date: string; ref: string; by: string }; tranche: string; field: string; was: string; now: string };
export interface Change { key: string; at: string; tranche: string; field: string; was: string; now: string; by: string }
export interface Editor { apply: (ops: Op[]) => void; undo: () => void; canUndo: boolean; log: Change[] }

const last = (s: StepState) => s.entries.at(-1);
const num = (v: string) => Number(String(v).replace(/[^\d.]/g, ''));

/** One field edited on one step → the entry to record. Amount is the new total received. */
export function stepOp(s: StepState, field: 'amount' | 'count' | 'ref' | 'date', value: string, ref: string | undefined, label: string, tranche: string): Op | string {
  const r = (field === 'ref' ? value : ref ?? last(s)?.ref ?? '').trim();
  if (r.length < 4) return 'Add the bank / payment ref';
  const entry: Entry = { date: field === 'date' ? value : AS_OF, by: ME, ref: r };
  let was = '—'; let now = '';
  if (field === 'amount') {
    const total = num(value);
    if (!(total >= 0)) return 'Enter an amount';
    if (total > (s.step.amount ?? 0) * 1.2) return 'More than 120% of the amount due';
    entry.amount = total - s.received; was = rm(s.received); now = `${rm(total)} · ${r}`;
  } else if (field === 'count') {
    const c = /^all$/i.test(value.trim()) ? s.step.total ?? 0 : Number(value);
    if (!(c >= 0 && c <= (s.step.total ?? 0))) return `0–${s.step.total} or "all"`;
    entry.count = c; was = `${s.paid}/${s.step.total}`; now = `${c}/${s.step.total} · ${r}`;
  } else if (field === 'ref') {
    was = last(s)?.ref ?? '—'; now = r;
  } else { was = last(s) ? dateShort(last(s)!.date) : '—'; now = dateShort(value); }
  if (s.step.kind === 'release' && !s.done) entry.amount = s.step.amount;
  const what = field === 'amount' ? 'Payment recorded' : field === 'count' ? 'Investors paid' : field === 'ref' ? 'Bank ref updated' : 'Date updated';
  return { type: 'entry', key: s.step.key, entry, tranche, field: `${what} · ${label}`, was, now };
}

export function invoiceOp(i: InvoiceState, field: 'ref' | 'date', value: string, ref: string | undefined, tranche: string): Op | string {
  const r = (field === 'ref' ? value : ref ?? (i.inv.collection === 'Invoice' ? i.paid?.ref : '') ?? '').trim();
  if (r.length < 4) return 'Add the bank ref';
  const date = field === 'date' ? value : i.paid?.date ?? AS_OF;
  return { type: 'inv', id: i.inv.id, rec: { date, ref: r, by: ME }, tranche, field: `${i.paid ? 'Invoice updated' : 'Invoice received'} · ${i.inv.id} ${i.inv.fee}`, was: i.paid ? `${dateShort(i.paid.date)} · ${i.paid.ref}` : 'Unpaid', now: `${dateShort(date)} · ${r}` };
}
