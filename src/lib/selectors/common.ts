import { addDays } from '../../data/asOf';
import { TRANCHES } from '../../data/tranches';
import type { Period } from '../period';

/** Point-in-time comparison date for stock measures (counts and balances). */
export function compareDate(p: Period): { at: string; label: string } {
  if (p.compare) return { at: p.compare.end, label: `vs ${p.compare.label}` };
  return { at: addDays(p.start, -1), label: 'vs start of year' };
}

/** Tranche active at a date: opened and not yet matured. */
export const activeTranchesAt = (d: string) => TRANCHES.filter((t) => t.openDate <= d && t.maturityDate > d).length;
