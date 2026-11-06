import { AS_OF, FY_START, addDays, daysBetween, monthKey, shiftMonthKey, monthStart, monthEnd } from '../data/asOf';
import { date, monthLabel } from './format';

/** A calendar month ("M:2026-10"), year to date, or a custom date range. */
export type PeriodKey = `M:${string}` | 'YTD' | 'CUSTOM';

export interface Range {
  start: string;
  end: string;
}

export interface Period extends Range {
  key: PeriodKey;
  label: string;
  short: string;
  compare: (Range & { label: string; short: string }) | null;
}

const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthFull = (k: string) => `${FULL_MONTHS[Number(k.slice(5, 7)) - 1]} ${k.slice(0, 4)}`;
const monthShortName = (k: string) => monthLabel(k, false);

const curMonth = monthKey(AS_OF);
/** Earliest month with data. */
export const FIRST_MONTH = '2025-10';
export const MIN_DATE = monthStart(FIRST_MONTH);

export const DEFAULT_PERIOD: PeriodKey = `M:${curMonth}`;

/** Dropdown options: every month with data, newest first, then year to date. */
export const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  ...Array.from({ length: 13 }, (_, i) => shiftMonthKey(curMonth, -i))
    .filter((m) => m >= FIRST_MONTH)
    .map((m) => ({ key: `M:${m}` as PeriodKey, label: monthFull(m) })),
  { key: 'YTD', label: `Year to date ${curMonth.slice(0, 4)}` },
];

export function buildPeriod(key: PeriodKey, custom?: Range): Period {
  if (key === 'YTD') {
    return { key, start: FY_START, end: AS_OF, label: `${AS_OF.slice(0, 4)} to date`, short: 'YTD', compare: null };
  }
  if (key === 'CUSTOM') {
    const r = custom ?? { start: monthStart(curMonth), end: AS_OF };
    const len = daysBetween(r.start, r.end);
    const cEnd = addDays(r.start, -1);
    return {
      key, start: r.start, end: r.end, label: `${date(r.start)} – ${date(r.end)}`, short: 'Custom',
      compare: { start: addDays(cEnd, -len), end: cEnd, label: 'preceding period', short: 'vs prior period' },
    };
  }
  const m = key.slice(2);
  const end = monthEnd(m) < AS_OF ? monthEnd(m) : AS_OF;
  const partial = end < monthEnd(m);
  const pm = shiftMonthKey(m, -1);
  const day = Number(end.slice(8, 10));
  return {
    key, start: monthStart(m), end, label: partial ? `${monthFull(m)} to date` : monthFull(m), short: monthShortName(m),
    compare: {
      start: monthStart(pm),
      end: partial ? addDays(monthStart(pm), day - 1) : monthEnd(pm),
      label: partial ? `same point in ${monthFull(pm)}` : monthFull(pm),
      short: `vs ${monthShortName(pm)}`,
    },
  };
}

/** If a custom range is exactly one calendar month (or month to date), return that month's key. */
export function keyForRange(r: Range): PeriodKey {
  const m = monthKey(r.start);
  if (r.start === monthStart(m) && monthKey(r.end) === m) {
    const expectedEnd = monthEnd(m) < AS_OF ? monthEnd(m) : AS_OF;
    if (r.end === expectedEnd) return `M:${m}`;
  }
  if (r.start === FY_START && r.end === AS_OF) return 'YTD';
  return 'CUSTOM';
}

export const inRange = (d: string, r: Range) => d >= r.start && d <= r.end;

/** Month keys touched by a range. */
export function monthsIn(r: Range): string[] {
  const out: string[] = [];
  let k = monthKey(r.start);
  while (k <= monthKey(r.end)) {
    out.push(k);
    k = shiftMonthKey(k, 1);
  }
  return out;
}
