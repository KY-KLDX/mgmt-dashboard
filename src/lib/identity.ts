import type { Investor } from '../data/types';
import { INVESTORS } from '../data/investors';

/*
 * Investor identity for display. The dashboard never holds investor names: only the ID and
 * initials. If the page or its data leaked, it could not be used to link a person to how much
 * they hold. A production build should keep it that way by sending only IDs and initials to
 * the browser; names stay in the back-office system of record.
 */

/** ID plus initials, e.g. "INV-1017 · SFO". Used everywhere except the ID-only investor table. */
export function investorLabel(inv: Pick<Investor, 'id' | 'initials'>): string {
  return `${inv.id} · ${inv.initials}`;
}

export const investorShortLabel = investorLabel;

const byId = new Map(INVESTORS.map((i) => [i.id, i]));

export function investorLabelById(id: string): string {
  const inv = byId.get(id);
  return inv ? investorLabel(inv) : id;
}

/** Secondary line under an investor label. */
export function investorSubLabel(inv: Investor): string {
  return inv.type;
}

/** Matches on ID or initials only. */
export function investorMatches(inv: Investor, q: string): boolean {
  const s = q.trim().toLowerCase();
  return inv.id.toLowerCase().includes(s) || inv.initials.toLowerCase() === s;
}
