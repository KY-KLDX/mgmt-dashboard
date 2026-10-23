import { toDate } from '../data/asOf';

const nf0 = new Intl.NumberFormat('en-MY', { maximumFractionDigits: 0 });

/** Full exact Ringgit value, e.g. "RM 1,250,000". */
export function rm(n: number): string {
  const sign = n < 0 ? '−' : '';
  return `${sign}RM ${nf0.format(Math.abs(Math.round(n)))}`;
}

/** Abbreviated Ringgit value for headline cards, e.g. "RM 2.4 million" or "RM 785,500". */
export function rmShort(n: number): string {
  const a = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (a >= 1_000_000) {
    const m = a / 1_000_000;
    return `${sign}RM ${m >= 100 ? m.toFixed(0) : m >= 10 ? m.toFixed(1) : m.toFixed(2)} million`;
  }
  return rm(n);
}

/** Compact axis label, e.g. "RM 4m", "RM 250k". */
export function rmAxis(n: number): string {
  const a = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (a >= 1_000_000) return `${sign}RM ${+(a / 1_000_000).toFixed(1)}m`;
  if (a >= 1_000) return `${sign}RM ${Math.round(a / 1_000)}k`;
  return `${sign}RM ${a}`;
}

export function pct(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}

export function int(n: number): string {
  return nf0.format(n);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function date(d: string | null | undefined): string {
  if (!d) return '—';
  const x = toDate(d.slice(0, 10));
  return `${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]} ${x.getUTCFullYear()}`;
}

export function dateShort(d: string): string {
  const x = toDate(d.slice(0, 10));
  return `${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]}`;
}

export function dateTime(iso: string): string {
  return `${date(iso.slice(0, 10))}, ${iso.slice(11, 16)}`;
}

export function monthLabel(key: string, withYear = true): string {
  const [y, m] = key.split('-').map(Number);
  return withYear ? `${MONTHS[m - 1]} ${String(y).slice(2)}` : MONTHS[m - 1];
}

export function monthLong(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

/** "in 4 days", "today", "3 days overdue". */
export function relDays(days: number, pastWord = 'overdue'): string {
  if (days === 0) return 'Due today';
  if (days > 0) return `${days} day${days === 1 ? '' : 's'} left`;
  return `${-days} day${days === -1 ? '' : 's'} ${pastWord}`;
}

export function signed(n: number, f: (x: number) => string): string {
  if (n === 0) return f(0);
  return `${n > 0 ? '+' : '−'}${f(Math.abs(n))}`;
}
