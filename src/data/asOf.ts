import type { ISODate } from './types';

/** Fixed synthetic reporting date, so all time-based figures are stable on every run. */
export const AS_OF: ISODate = '2026-10-23';
export const AS_OF_TIME = '08:30';
export const AS_OF_LABEL = '23 Oct 2026, 08:30 MYT';
/** Financial year runs January to December. */
export const FY_START: ISODate = '2026-01-01';

export function toDate(d: ISODate): Date {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

export function fromDate(d: Date): ISODate {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: ISODate, n: number): ISODate {
  const x = toDate(d);
  x.setUTCDate(x.getUTCDate() + n);
  return fromDate(x);
}

export function addMonths(d: ISODate, n: number): ISODate {
  const x = toDate(d);
  const day = x.getUTCDate();
  x.setUTCDate(1);
  x.setUTCMonth(x.getUTCMonth() + n);
  const last = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 0)).getUTCDate();
  x.setUTCDate(Math.min(day, last));
  return fromDate(x);
}

/** Whole days from a to b (positive when b is later). */
export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86_400_000);
}

/** Days from the as-of date until d. Negative means d is in the past (overdue). */
export function daysFromAsOf(d: ISODate): number {
  return daysBetween(AS_OF, d);
}

export function monthKey(d: ISODate): string {
  return d.slice(0, 7);
}

export function monthEnd(key: string): ISODate {
  const [y, m] = key.split('-').map(Number);
  return fromDate(new Date(Date.UTC(y, m, 0)));
}

export function monthStart(key: string): ISODate {
  return `${key}-01`;
}

export function shiftMonthKey(key: string, n: number): string {
  return monthKey(addMonths(monthStart(key), n));
}

/** Twelve trailing month keys ending with the as-of month. */
export const TREND_MONTHS: string[] = Array.from({ length: 13 }, (_, i) => shiftMonthKey(monthKey(AS_OF), i - 12));
