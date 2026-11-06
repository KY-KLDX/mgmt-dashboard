import type { Investor } from '../data/types';
import { INVESTORS } from '../data/investors';

/*
 * Investor display identity. The dashboard has a single view: everyone with access to the
 * page sees investor names, so access to the page itself must be limited to cleared staff.
 * A production build would enforce that with server-side access control.
 */
export function investorLabel(inv: Pick<Investor, 'id' | 'name'>): string {
  return inv.name;
}

const byId = new Map(INVESTORS.map((i) => [i.id, i]));

export function investorLabelById(id: string): string {
  return byId.get(id)?.name ?? id;
}

/** Secondary line under an investor's name. */
export function investorSubLabel(inv: Investor): string {
  return inv.id;
}

export function investorMatches(inv: Investor, q: string): boolean {
  const s = q.toLowerCase();
  return inv.id.toLowerCase().includes(s) || inv.name.toLowerCase().includes(s);
}
