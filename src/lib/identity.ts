import type { Investor, Role } from '../data/types';
import { INVESTORS } from '../data/investors';

/*
 * The ONLY place investor display identities are produced. Every table, chart, tooltip,
 * drawer title, search result, alert and export preview must go through these helpers.
 * In Management View the fictional name is never returned. This is a prototype simulation;
 * production access would require server-side role-based access control.
 */
export function investorLabel(inv: Pick<Investor, 'id' | 'name'>, role: Role): string {
  return role === 'CEO' ? inv.name : inv.id;
}

const byId = new Map(INVESTORS.map((i) => [i.id, i]));

export function investorLabelById(id: string, role: Role): string {
  const inv = byId.get(id);
  return inv ? investorLabel(inv, role) : id;
}

/** Secondary line under the label: in CEO view the anonymised ID, in Management view the investor type. */
export function investorSubLabel(inv: Investor, role: Role): string {
  return role === 'CEO' ? inv.id : `${inv.type} investor`;
}

/** Search match that never matches on names in Management View. */
export function investorMatches(inv: Investor, q: string, role: Role): boolean {
  const s = q.toLowerCase();
  if (inv.id.toLowerCase().includes(s)) return true;
  return role === 'CEO' && inv.name.toLowerCase().includes(s);
}
