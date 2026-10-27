import { AS_OF, FY_START, addDays, daysBetween, monthKey, shiftMonthKey, monthStart, monthEnd } from '../data/asOf';
import { date, monthLabel, monthLong } from './format';

const monthShortName = (k: string) => monthLabel(k, false);

export type PeriodKey = 'MTD' | 'PREV' | 'QTD' | 'YTD' | 'CUSTOM';

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

export const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: 'MTD', label: 'Current month (MTD)' },
  { key: 'PREV', label: 'Previous month' },
  { key: 'QTD', label: 'Quarter to date' },
  { key: 'YTD', label: 'Year to date' },
  { key: 'CUSTOM', label: 'Custom range' },
];

const curMonth = monthKey(AS_OF);
const dayOfMonth = Number(AS_OF.slice(8, 10));

export function buildPeriod(key: PeriodKey, custom?: Range): Period {
  switch (key) {
    case 'MTD': {
      const pm = shiftMonthKey(curMonth, -1);
      return {
        key, start: monthStart(curMonth), end: AS_OF, label: `${monthLong(curMonth)} to date`, short: 'MTD',
        compare: { start: monthStart(pm), end: addDays(monthStart(pm), dayOfMonth - 1), label: `same point in ${monthLong(pm)}`, short: `vs ${monthShortName(pm)}` },
      };
    }
    case 'PREV': {
      const pm = shiftMonthKey(curMonth, -1);
      const ppm = shiftMonthKey(curMonth, -2);
      return {
        key, start: monthStart(pm), end: monthEnd(pm), label: monthLong(pm), short: monthLong(pm),
        compare: { start: monthStart(ppm), end: monthEnd(ppm), label: monthLong(ppm), short: `vs ${monthShortName(ppm)}` },
      };
    }
    case 'QTD': {
      const m = Number(curMonth.slice(5, 7));
      const qStartMonth = `${curMonth.slice(0, 4)}-${String(Math.floor((m - 1) / 3) * 3 + 1).padStart(2, '0')}`;
      const qStart = monthStart(qStartMonth);
      const elapsed = daysBetween(qStart, AS_OF);
      const pqStart = monthStart(shiftMonthKey(qStartMonth, -3));
      return {
        key, start: qStart, end: AS_OF, label: `Q${Math.floor((m - 1) / 3) + 1} ${curMonth.slice(0, 4)} to date`, short: 'QTD',
        compare: { start: pqStart, end: addDays(pqStart, elapsed), label: 'same point last quarter', short: 'vs last quarter' },
      };
    }
    case 'YTD':
      return { key, start: FY_START, end: AS_OF, label: `FY${AS_OF.slice(0, 4)} to date`, short: 'YTD', compare: null };
    case 'CUSTOM': {
      const r = custom ?? { start: monthStart(shiftMonthKey(curMonth, -2)), end: AS_OF };
      const len = daysBetween(r.start, r.end);
      const cEnd = addDays(r.start, -1);
      return {
        key, start: r.start, end: r.end, label: `${date(r.start)} – ${date(r.end)}`, short: 'Custom',
        compare: { start: addDays(cEnd, -len), end: cEnd, label: 'preceding period', short: 'vs prior period' },
      };
    }
  }
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
