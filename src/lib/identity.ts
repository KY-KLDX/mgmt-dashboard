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

const SUFFIXES = /\b(Sdn Bhd|Berhad|Bhd|Enterprise)\b/g;

/** Initials without legal suffixes, e.g. "Sentosa Family Office Sdn Bhd" → "SFO". */
export function investorInitials(inv: Pick<Investor, 'name'>): string {
  return inv.name.replace(SUFFIXES, '').trim().split(/\s+/).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

/** Privacy-reduced label for feeds: ID plus initials, e.g. "INV-1017 · SFO". */
export function investorShortLabel(inv: Pick<Investor, 'id' | 'name'>): string {
  return `${inv.id} · ${investorInitials(inv)}`;
}
