import { AS_OF, addDays, daysFromAsOf } from '../../data/asOf';
import { INVESTORS, TRANSACTIONS } from '../../data/investors';
import { OBLIGATIONS } from '../../data/obligations';
import { CYBER_RISKS, INCIDENTS, RESILIENCE } from '../../data/tech';
import type { Thresholds } from '../../data/thresholds';
import type { GovItem, Role, Severity } from '../../data/types';
import { date, rm } from '../format';
import { investorLabel } from '../identity';
import type { LinkTarget } from '../nav';
import { allTrancheStats } from './finance';
import { isCtosIncomplete, isKycIncomplete, onboardingAge } from './investors';
import { govDecision, govOpen, govOverdue, govPrepMissed, incidentOpen, obligationOpen, obligationOverdue, riskOverdue, riskRating } from './ops';

export type Area = 'Finance & Tranches' | 'Investors' | 'Issuers' | 'Technology' | 'Governance';

export interface Alert {
  id: string;
  severity: Severity;
  title: string;
  area: Area;
  owner: string;
  /** Due date, or the date the matter started (for age-based items). */
  date: string | null;
  dateKind: 'due' | 'since';
  action: string;
  link: LinkTarget;
}

export const SEVERITY_RANK: Record<Severity, number> = { Critical: 0, High: 1, Medium: 2, Low: 3, Informational: 4 };

/**
 * Shared cross-domain alert model. Rules are illustrative demo thresholds (see Settings),
 * not KLDX policy. Each source record produces at most one alert.
 */
export function buildAlerts(gov: GovItem[], th: Thresholds, role: Role): Alert[] {
  const out: Alert[] = [];
  const alertedTranches = new Set<string>();

  // Tranches closing soon below target.
  for (const s of allTrancheStats(th)) {
    if (!s.indicative || s.daysToClose < 0 || s.daysToClose > th.trancheClosingSoonDays) continue;
    const p = s.fulfilment * 100;
    if (p >= th.trancheUnderTargetPct) continue;
    alertedTranches.add(s.tranche.id);
    out.push({
      id: `AL-${s.tranche.id}`, severity: p < th.trancheCriticalPct ? 'Critical' : 'High',
      title: `${s.tranche.name} closing in ${s.daysToClose} days at ${Math.round(p)}% of target`,
      area: 'Finance & Tranches', owner: 'Head of Issuer Origination', date: s.tranche.closeDate, dateKind: 'due',
      action: 'Decide: extend offer period, downsize issuance or close as scheduled.',
      link: { page: 'finance', drawer: { kind: 'tranche', id: s.tranche.id } },
    });
  }

  // Issuer obligations.
  for (const o of OBLIGATIONS.filter(obligationOpen)) {
    if (o.trancheId && alertedTranches.has(o.trancheId) && o.type === 'Tranche closing') continue;
    const d = daysFromAsOf(o.dueDate);
    const severe = o.risk === 'High' || o.risk === 'Critical';
    let sev: Severity | null = null;
    if (obligationOverdue(o)) sev = o.risk === 'Critical' ? 'Critical' : severe ? 'High' : 'Medium';
    else if (d <= th.dueSoonDays) sev = severe || o.status === 'At risk' ? 'High' : 'Medium';
    else if (d <= 30 && severe) sev = 'Medium';
    if (!sev) continue;
    out.push({
      id: `AL-${o.id}`, severity: sev, title: `${o.title}${obligationOverdue(o) ? ' — overdue' : ''}`, area: 'Issuers',
      owner: o.owner, date: o.dueDate, dateKind: 'due', action: o.nextAction,
      link: { page: 'issuers', params: { q: o.id }, drawer: { kind: 'issuer', id: o.issuerId } },
    });
  }

  // Technology incidents.
  for (const i of INCIDENTS.filter(incidentOpen)) {
    if (i.severity !== 'Critical' && i.severity !== 'High') continue;
    out.push({
      id: `AL-${i.id}`, severity: i.severity === 'Critical' ? 'Critical' : i.status === 'Monitoring' ? 'Medium' : 'High', title: i.title, area: 'Technology', owner: i.owner,
      date: i.detectedAt.slice(0, 10), dateKind: 'since', action: i.decisionRequired ?? `Resolve by ${date(i.targetResolution)}.`,
      link: { page: 'technology', drawer: { kind: 'incident', id: i.id } },
    });
  }

  // Cyber risks with overdue treatment.
  for (const r of CYBER_RISKS.filter(riskOverdue)) {
    const rating = riskRating(r);
    if (rating !== 'Critical' && rating !== 'High') continue;
    out.push({
      id: `AL-${r.id}`, severity: rating === 'Critical' ? 'Critical' : 'High', title: `${rating} cyber risk with overdue treatment: ${r.title}`,
      area: 'Technology', owner: r.owner, date: r.targetDate, dateKind: 'due', action: r.treatment,
      link: { page: 'technology', drawer: { kind: 'risk', id: r.id } },
    });
  }

  for (const m of RESILIENCE.filter((x) => x.status === 'Failed')) {
    out.push({
      id: `AL-${m.id}`, severity: 'High', title: `${m.label}: ${m.value.toLowerCase()}`, area: 'Technology', owner: 'Chief Technology Officer',
      date: null, dateKind: 'due', action: 'Schedule and complete a full recovery re-test.', link: { page: 'technology', params: { section: 'resilience' } },
    });
  }

  // Governance.
  for (const g of gov.filter(govOpen)) {
    if (g.relatedAlert && out.some((a) => a.id === g.relatedAlert)) continue;
    let sev: Severity | null = null;
    let reason = '';
    if (govOverdue(g)) {
      sev = g.priority === 'High' ? 'Critical' : 'High';
      reason = 'overdue';
    } else if (g.blocker && g.priority === 'High') {
      sev = daysFromAsOf(g.targetDate) < th.decisionWindowDays ? 'High' : 'Medium';
      reason = 'blocked';
    } else if (govDecision(g) && g.body === 'CEO' && daysFromAsOf(g.targetDate) <= th.decisionWindowDays) {
      sev = 'High';
      reason = 'awaiting CEO decision';
    } else if (govPrepMissed(g)) {
      sev = g.priority === 'High' ? 'High' : 'Medium';
      reason = 'preparation deadline missed';
    } else if (g.body === 'Board' && daysFromAsOf(g.targetDate) <= 30 && g.readiness < 50) {
      sev = 'Medium';
      reason = `${g.readiness}% ready for Board`;
    }
    if (!sev) continue;
    out.push({
      id: `AL-${g.id}`, severity: sev, title: `${g.title} — ${reason}`, area: 'Governance', owner: g.owner, date: g.targetDate, dateKind: 'due',
      action: g.blocker ? `Unblock: ${g.blocker}` : g.nextAction, link: { page: 'governance', drawer: { kind: 'governance', id: g.id } },
    });
  }

  // Onboarding backlog.
  const ctos = INVESTORS.filter((i) => isCtosIncomplete(i));
  const kyc = INVESTORS.filter((i) => isKycIncomplete(i));
  const stale = [...ctos, ...kyc].filter((i) => onboardingAge(i) > th.onboardingStaleDays);
  if (ctos.length + kyc.length >= th.onboardingBacklogCount) {
    out.push({
      id: 'AL-ONBOARDING', severity: stale.length >= th.onboardingBacklogCount ? 'High' : 'Medium',
      title: `${ctos.length + kyc.length} incomplete onboarding cases (${ctos.length} CTOS, ${kyc.length} KYC); ${stale.length} older than ${th.onboardingStaleDays} days`,
      area: 'Investors', owner: 'Head of Investor Operations', date: null, dateKind: 'since',
      action: 'Chase stale cases; review eKYC vendor turnaround (INC-2603).', link: { page: 'investors', params: { stage: 'incomplete' } },
    });
  }

  // High-value failed top-ups in the last 30 days.
  const since = addDays(AS_OF, -30);
  for (const t of TRANSACTIONS.filter((x) => x.type === 'Top-up' && x.status === 'Failed' && x.amount >= th.highValueTopUp && x.date >= since)) {
    const inv = INVESTORS.find((i) => i.id === t.investorId)!;
    out.push({
      id: `AL-${t.id}`, severity: 'High', title: `${rm(t.amount)} top-up failed — ${investorLabel(inv, role)}`, area: 'Investors',
      owner: 'Head of Investor Operations', date: t.date, dateKind: 'since', action: `Investigate: ${t.note ?? 'failure reason'}.`,
      link: { page: 'investors', drawer: { kind: 'investor', id: inv.id } },
    });
  }

  return out.sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || (a.date ?? '9999').localeCompare(b.date ?? '9999'),
  );
}

export interface UpcomingItem {
  id: string;
  date: string;
  title: string;
  kind: 'Issuer event' | 'Board paper' | 'Policy review' | 'Application' | 'Technology-risk action' | 'Decision';
  owner: string;
  link: LinkTarget;
}

export function upcomingItems(gov: GovItem[], horizonDays = 45): UpcomingItem[] {
  const within = (d: string) => daysFromAsOf(d) >= 0 && daysFromAsOf(d) <= horizonDays;
  const items: UpcomingItem[] = [];
  for (const o of OBLIGATIONS.filter((x) => obligationOpen(x) && within(x.dueDate))) {
    items.push({ id: o.id, date: o.dueDate, title: o.title, kind: 'Issuer event', owner: o.owner, link: { page: 'issuers', drawer: { kind: 'issuer', id: o.issuerId } } });
  }
  for (const g of gov.filter((x) => govOpen(x) && within(x.targetDate))) {
    const kind: UpcomingItem['kind'] = g.application ? 'Application' : g.policy ? 'Policy review' : g.body === 'Board' ? 'Board paper' : 'Decision';
    items.push({ id: g.id, date: g.targetDate, title: g.title, kind, owner: g.owner, link: { page: 'governance', drawer: { kind: 'governance', id: g.id } } });
  }
  for (const r of CYBER_RISKS.filter((x) => !x.treatmentComplete && within(x.targetDate))) {
    items.push({ id: r.id, date: r.targetDate, title: `Risk treatment: ${r.title}`, kind: 'Technology-risk action', owner: r.owner, link: { page: 'technology', drawer: { kind: 'risk', id: r.id } } });
  }
  return items.sort((a, b) => a.date.localeCompare(b.date));
}

