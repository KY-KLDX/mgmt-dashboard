import { INVESTORS } from '../../data/investors';
import { ISSUERS } from '../../data/issuers';
import { OBLIGATIONS } from '../../data/obligations';
import { CYBER_RISKS, INCIDENTS } from '../../data/tech';
import { TRANCHES } from '../../data/tranches';
import type { GovItem, Role } from '../../data/types';
import { investorLabel, investorMatches, investorSubLabel } from '../identity';
import type { LinkTarget } from '../nav';
import { issuerShort } from './finance';

export interface SearchResult {
  key: string;
  group: 'Tranches' | 'Issuers' | 'Investors' | 'Incidents & risks' | 'Governance' | 'Obligations';
  title: string;
  sub: string;
  link: LinkTarget;
}

const has = (s: string, q: string) => s.toLowerCase().includes(q);

export function search(q: string, role: Role, gov: GovItem[]): SearchResult[] {
  const s = q.trim().toLowerCase();
  if (s.length < 2) return [];
  const out: SearchResult[] = [];
  for (const t of TRANCHES) {
    if (has(t.name, s) || has(t.id, s) || has(issuerShort(t.issuerId), s))
      out.push({ key: t.id, group: 'Tranches', title: t.name, sub: `${t.id} · ${t.stage}`, link: { page: 'finance', drawer: { kind: 'tranche', id: t.id } } });
  }
  for (const i of ISSUERS) {
    if (has(i.name, s) || has(i.sector, s))
      out.push({ key: i.id, group: 'Issuers', title: i.name, sub: `${i.sector} · ${i.status}`, link: { page: 'issuers', drawer: { kind: 'issuer', id: i.id } } });
  }
  for (const inv of INVESTORS) {
    if (investorMatches(inv, s, role))
      out.push({ key: inv.id, group: 'Investors', title: investorLabel(inv, role), sub: `${investorSubLabel(inv, role)} · ${inv.accountStatus}`, link: { page: 'investors', drawer: { kind: 'investor', id: inv.id } } });
  }
  for (const i of INCIDENTS) {
    if (has(i.title, s) || has(i.id, s) || has(i.service, s))
      out.push({ key: i.id, group: 'Incidents & risks', title: i.title, sub: `${i.id} · ${i.severity} · ${i.status}`, link: { page: 'technology', drawer: { kind: 'incident', id: i.id } } });
  }
  for (const r of CYBER_RISKS) {
    if (has(r.title, s) || has(r.id, s))
      out.push({ key: r.id, group: 'Incidents & risks', title: r.title, sub: `${r.id} · Cyber risk`, link: { page: 'technology', drawer: { kind: 'risk', id: r.id } } });
  }
  for (const g of gov) {
    if (has(g.title, s) || has(g.id, s) || has(g.category, s))
      out.push({ key: g.id, group: 'Governance', title: g.title, sub: `${g.id} · ${g.category} · ${g.stage}`, link: { page: 'governance', drawer: { kind: 'governance', id: g.id } } });
  }
  for (const o of OBLIGATIONS) {
    if (has(o.title, s) || has(o.id, s))
      out.push({ key: o.id, group: 'Obligations', title: o.title, sub: `${o.id} · ${o.type}`, link: { page: 'issuers', params: { q: o.id }, drawer: { kind: 'issuer', id: o.issuerId } } });
  }
  return out.slice(0, 40);
}
